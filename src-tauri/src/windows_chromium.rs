//! Windows 专属浏览器的生命周期。Job 句柄仅由应用持有，崩溃时也由系统回收。
use std::fs::OpenOptions;
use std::io::{Read, Seek, SeekFrom};
use std::os::windows::fs::OpenOptionsExt;
use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use apw_core::apple::ApiError;
use serde::Deserialize;
use windows_sys::Win32::Foundation::{
    FILETIME, HANDLE, INVALID_HANDLE_VALUE, LocalFree, WAIT_TIMEOUT,
};
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, TH32CS_SNAPTHREAD, THREADENTRY32, Thread32First, Thread32Next,
};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
    SetInformationJobObject, TerminateJobObject,
};
use windows_sys::Win32::System::Threading::{
    GetProcessTimes, OpenProcess, OpenThread, PROCESS_QUERY_LIMITED_INFORMATION,
    PROCESS_SYNCHRONIZE, PROCESS_TERMINATE, ResumeThread, THREAD_SUSPEND_RESUME, TerminateProcess,
    WaitForSingleObject,
};
use windows_sys::Win32::UI::Shell::CommandLineToArgvW;

use crate::browser_support::is_owned_browser_command;

fn failure(action: &str) -> ApiError {
    ApiError::Transport(format!("{action}：{}", std::io::Error::last_os_error()))
}

/// 从本机可执行文件读取版本，浏览器在连接 CDP 前退出时也能留下版本证据。
pub(crate) fn browser_file_version(browser: &Path) -> Option<String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        GetFileVersionInfoSizeW, GetFileVersionInfoW, VS_FIXEDFILEINFO, VerQueryValueW,
    };
    let path: Vec<u16> = browser.as_os_str().encode_wide().chain(Some(0)).collect();
    let size = unsafe { GetFileVersionInfoSizeW(path.as_ptr(), std::ptr::null_mut()) };
    if size == 0 || size > 1024 * 1024 {
        return None;
    }
    let mut data = vec![0u8; size as usize];
    if unsafe { GetFileVersionInfoW(path.as_ptr(), 0, size, data.as_mut_ptr().cast()) } == 0 {
        return None;
    }
    let mut info = std::ptr::null_mut();
    let mut len = 0;
    if unsafe {
        VerQueryValueW(
            data.as_ptr().cast(),
            [92u16, 0].as_ptr(),
            &mut info,
            &mut len,
        )
    } == 0
        || info.is_null()
        || len < std::mem::size_of::<VS_FIXEDFILEINFO>() as u32
    {
        return None;
    }
    let version = unsafe { std::ptr::read_unaligned(info.cast::<VS_FIXEDFILEINFO>()) };
    if version.dwSignature != 0xfeef04bd {
        return None;
    }
    Some(format!(
        "{}.{}.{}.{}",
        version.dwFileVersionMS >> 16,
        version.dwFileVersionMS & 0xffff,
        version.dwFileVersionLS >> 16,
        version.dwFileVersionLS & 0xffff
    ))
}

#[derive(Debug)]
pub(crate) struct BrowserJob(OwnedHandle);

impl BrowserJob {
    pub(crate) fn new() -> Result<Self, ApiError> {
        let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if handle.is_null() {
            return Err(failure("无法建立 Windows 浏览器进程管理"));
        }
        let job = Self(unsafe { OwnedHandle::from_raw_handle(handle) });
        let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if unsafe {
            SetInformationJobObject(
                job.0.as_raw_handle(),
                JobObjectExtendedLimitInformation,
                (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
                std::mem::size_of_val(&limits) as u32,
            )
        } == 0
        {
            return Err(failure("无法设置 Windows 浏览器退出清理"));
        }
        Ok(job)
    }

    /// 浏览器以 CREATE_SUSPENDED 启动，加入 Job 后才执行，避免子进程提前逃逸。
    pub(crate) fn assign_and_resume(&self, child: &Child) -> Result<(), ApiError> {
        if unsafe { AssignProcessToJobObject(self.0.as_raw_handle(), child.as_raw_handle()) } == 0 {
            return Err(failure("无法托管 Windows 浏览器进程"));
        }
        let raw = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) };
        if raw == INVALID_HANDLE_VALUE {
            return Err(failure("无法检查浏览器启动线程"));
        }
        let snapshot = unsafe { OwnedHandle::from_raw_handle(raw) };
        let mut entry: THREADENTRY32 = unsafe { std::mem::zeroed() };
        entry.dwSize = std::mem::size_of_val(&entry) as u32;
        let mut found = unsafe { Thread32First(snapshot.as_raw_handle(), &mut entry) } != 0;
        while found {
            if entry.th32OwnerProcessID == child.id() {
                let raw = unsafe { OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID) };
                if raw.is_null() {
                    return Err(failure("无法访问浏览器启动线程"));
                }
                let thread = unsafe { OwnedHandle::from_raw_handle(raw) };
                if unsafe { ResumeThread(thread.as_raw_handle()) } == u32::MAX {
                    return Err(failure("无法恢复浏览器启动线程"));
                }
                return Ok(());
            }
            found = unsafe { Thread32Next(snapshot.as_raw_handle(), &mut entry) } != 0;
        }
        Err(ApiError::Transport(
            "未找到浏览器启动线程，本轮未继续启动".into(),
        ))
    }

    pub(crate) fn terminate(&self) {
        unsafe { TerminateJobObject(self.0.as_raw_handle(), 1) };
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct ProfileProcess {
    name: String,
    process_id: u32,
    parent_process_id: u32,
    command_line: String,
    created_at: u64,
}

fn command_args(command: &str) -> Vec<String> {
    let wide: Vec<u16> = command.encode_utf16().chain(Some(0)).collect();
    let mut count = 0;
    let args = unsafe { CommandLineToArgvW(wide.as_ptr(), &mut count) };
    if args.is_null() {
        return Vec::new();
    }
    let parsed = (0..count as usize)
        .map(|index| unsafe {
            let value = *args.add(index);
            let mut len = 0;
            while *value.add(len) != 0 {
                len += 1;
            }
            String::from_utf16_lossy(std::slice::from_raw_parts(value, len))
        })
        .collect();
    unsafe { LocalFree(args.cast()) };
    parsed
}

fn creation_time(handle: HANDLE) -> Result<u64, ApiError> {
    let [mut created, mut exited, mut kernel, mut user] = [FILETIME {
        dwLowDateTime: 0,
        dwHighDateTime: 0,
    }; 4];
    if unsafe { GetProcessTimes(handle, &mut created, &mut exited, &mut kernel, &mut user) } == 0 {
        return Err(failure("无法核验浏览器进程的创建时间"));
    }
    Ok((u64::from(created.dwHighDateTime) << 32) | u64::from(created.dwLowDateTime))
}

fn parent_still_alive(process: &ProfileProcess) -> Result<bool, ApiError> {
    let raw = unsafe {
        OpenProcess(
            PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SYNCHRONIZE,
            0,
            process.parent_process_id,
        )
    };
    if raw.is_null() {
        // ERROR_INVALID_PARAMETER 表示 PID 已不存在；权限不足不能视为父进程死亡。
        if std::io::Error::last_os_error().raw_os_error() == Some(87) {
            return Ok(false);
        }
        return Err(failure(
            "无法确认浏览器所属实例是否已经退出，本轮保留该进程",
        ));
    }
    let parent = unsafe { OwnedHandle::from_raw_handle(raw) };
    match unsafe { WaitForSingleObject(parent.as_raw_handle(), 0) } {
        0 => Ok(false),
        WAIT_TIMEOUT => Ok(creation_time(parent.as_raw_handle())? / 10 <= process.created_at / 10),
        _ => Err(failure("无法确认浏览器所属实例状态，本轮保留该进程")),
    }
}

fn profile_processes(profile: &Path) -> Result<Vec<ProfileProcess>, ApiError> {
    let mut output = tempfile::tempfile()
        .map_err(|e| ApiError::Transport(format!("无法建立进程检查缓冲：{e}")))?;
    let shell = std::env::var_os("SystemRoot")
        .map(std::path::PathBuf::from)
        .ok_or_else(|| ApiError::Transport("Windows 系统目录不可用".into()))?
        .join("System32/WindowsPowerShell/v1.0/powershell.exe");
    // 只读取包含本应用专属目录的浏览器命令行，不收集普通浏览器资料。
    let script = r#"$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $items=@(Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe' OR Name='chromium.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($env:APW_PROFILE_TO_CHECK,[StringComparison]::OrdinalIgnoreCase) -ge 0 } | Select-Object Name,ProcessId,ParentProcessId,CommandLine,@{Name='CreatedAt';Expression={$_.CreationDate.ToFileTimeUtc()}}); ConvertTo-Json -InputObject $items -Compress"#;
    let mut child = Command::new(shell)
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .env("APW_PROFILE_TO_CHECK", profile)
        .creation_flags(windows_sys::Win32::System::Threading::CREATE_NO_WINDOW)
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .stdout(
            output
                .try_clone()
                .map_err(|e| ApiError::Transport(e.to_string()))?,
        )
        .spawn()
        .map_err(|e| ApiError::Transport(format!("无法检查专属浏览器占用：{e}")))?;
    let deadline = Instant::now() + Duration::from_secs(5);
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(50)),
            result => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(ApiError::Transport(format!(
                    "专属浏览器占用检查未能完成，本轮保留现有进程：{result:?}"
                )));
            }
        }
    };
    if !status.success() {
        return Err(ApiError::Transport(
            "系统阻止了专属浏览器占用检查，本轮保留现有进程".into(),
        ));
    }
    output
        .seek(SeekFrom::Start(0))
        .map_err(|e| ApiError::Transport(e.to_string()))?;
    let mut json = Vec::new();
    output
        .take(64 * 1024)
        .read_to_end(&mut json)
        .map_err(|e| ApiError::Transport(e.to_string()))?;
    serde_json::from_slice(&json)
        .map_err(|_| ApiError::Transport("无法解析专属浏览器占用信息，本轮保留现有进程".into()))
}

pub(crate) fn reclaim_orphaned_profile_process(profile: &Path) -> Result<(), ApiError> {
    // 未发现锁冲突时不依赖 PowerShell/WMI，避免给正常启动增加额外限制。
    match OpenOptions::new()
        .write(true)
        .share_mode(1)
        .open(profile.join("lockfile"))
    {
        Ok(_) => return Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) if matches!(e.raw_os_error(), Some(32 | 33)) => {}
        Err(e) => {
            return Err(ApiError::Transport(format!(
                "无法访问浏览器专属资料目录的锁文件，请检查目录权限：{e}"
            )));
        }
    }
    let mut orphaned = Vec::new();
    for process in profile_processes(profile)? {
        if !is_owned_browser_command(&process.name, &command_args(&process.command_line), profile) {
            continue;
        }
        let raw = unsafe {
            OpenProcess(
                PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_TERMINATE | PROCESS_SYNCHRONIZE,
                0,
                process.process_id,
            )
        };
        if raw.is_null() {
            if std::io::Error::last_os_error().raw_os_error() == Some(87) {
                continue;
            }
            return Err(failure("无法核验专属浏览器占用进程，本轮保留该进程"));
        }
        let handle = unsafe { OwnedHandle::from_raw_handle(raw) };
        // CIM 时间精度为微秒，GetProcessTimes 为 100 ns；两边统一精度后比较。
        if creation_time(handle.as_raw_handle())? / 10 != process.created_at / 10 {
            continue;
        }
        if parent_still_alive(&process)? {
            return Err(ApiError::Transport(
                "另一个果到雷达实例或启动进程仍在使用专属浏览器，请先退出该实例；本轮保留现有进程"
                    .into(),
            ));
        }
        orphaned.push(handle);
    }
    if orphaned.is_empty() {
        return Err(ApiError::Transport(
            "浏览器专属资料目录被占用，未找到可安全回收的遗留进程。请检查其他实例和目录权限".into(),
        ));
    }
    // 用核验过创建时间的进程句柄结束进程，避免按 PID 终止时误伤复用的 PID。
    for handle in orphaned {
        if unsafe { TerminateProcess(handle.as_raw_handle(), 1) } == 0 {
            return Err(failure("未能回收专属浏览器遗留进程"));
        }
        if unsafe { WaitForSingleObject(handle.as_raw_handle(), 1000) } != 0 {
            return Err(ApiError::Transport(
                "专属浏览器遗留进程尚未退出，将在下一轮重新检查".into(),
            ));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        PROCESSENTRY32W, Process32FirstW, Process32NextW, TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::Threading::{CREATE_NO_WINDOW, CREATE_SUSPENDED};

    const PROCESS_FIXTURE: &str = "windows_chromium::tests::browser_job_process_fixture";

    // 用测试二进制自身建立父子关系，不依赖 cmd 的引号处理、PATH 或 ping。
    #[test]
    #[ignore = "仅供进程树回收测试作为子进程调用"]
    fn browser_job_process_fixture() {
        match std::env::var("APW_WINDOWS_JOB_FIXTURE").as_deref() {
            Ok("parent") => {
                let mut child = Command::new(std::env::current_exe().unwrap())
                    .args(["--exact", PROCESS_FIXTURE, "--ignored", "--nocapture"])
                    .env("APW_WINDOWS_JOB_FIXTURE", "child")
                    .creation_flags(CREATE_NO_WINDOW)
                    .stdin(Stdio::null())
                    .stdout(Stdio::null())
                    .stderr(Stdio::inherit())
                    .spawn()
                    .unwrap();
                child.wait().unwrap();
            }
            Ok("child") => std::thread::sleep(Duration::from_secs(30)),
            _ => {}
        }
    }

    #[test]
    fn windows_command_line_preserves_profile_with_spaces() {
        let args = command_args(
            r#""C:\Program Files\Google\Chrome\Application\chrome.exe" "--user-data-dir=C:\Users\Test User\chromium-profile-v1" --remote-debugging-address=127.0.0.1 --remote-debugging-port=12345"#,
        );
        assert!(is_owned_browser_command(
            "chrome.exe",
            &args,
            Path::new(r"C:\Users\Test User\chromium-profile-v1")
        ));
    }

    #[test]
    fn dropping_job_terminates_browser_like_process_tree() {
        let job = BrowserJob::new().unwrap();
        let mut stderr = tempfile::tempfile().unwrap();
        let mut child = Command::new(std::env::current_exe().unwrap())
            .args(["--exact", PROCESS_FIXTURE, "--ignored", "--nocapture"])
            .env("APW_WINDOWS_JOB_FIXTURE", "parent")
            .creation_flags(CREATE_SUSPENDED | CREATE_NO_WINDOW)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(stderr.try_clone().unwrap())
            .spawn()
            .unwrap();
        if let Err(error) = job.assign_and_resume(&child) {
            let _ = child.kill();
            let _ = child.wait();
            panic!("{error}");
        }
        let deadline = Instant::now() + Duration::from_secs(5);
        let descendant = loop {
            if let Some(status) = child.try_wait().unwrap() {
                stderr.seek(SeekFrom::Start(0)).unwrap();
                let mut detail = String::new();
                stderr.read_to_string(&mut detail).unwrap();
                panic!("模拟浏览器父进程提前退出：{status}；{detail}");
            }
            let raw = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
            assert_ne!(raw, INVALID_HANDLE_VALUE);
            let snapshot = unsafe { OwnedHandle::from_raw_handle(raw) };
            let mut entry: PROCESSENTRY32W = unsafe { std::mem::zeroed() };
            entry.dwSize = std::mem::size_of_val(&entry) as u32;
            let mut found = unsafe { Process32FirstW(snapshot.as_raw_handle(), &mut entry) } != 0;
            let mut descendant = None;
            while found {
                if entry.th32ParentProcessID == child.id() {
                    let raw = unsafe { OpenProcess(PROCESS_SYNCHRONIZE, 0, entry.th32ProcessID) };
                    if !raw.is_null() {
                        descendant = Some(unsafe { OwnedHandle::from_raw_handle(raw) });
                    }
                    break;
                }
                found = unsafe { Process32NextW(snapshot.as_raw_handle(), &mut entry) } != 0;
            }
            if let Some(handle) = descendant {
                break handle;
            }
            assert!(Instant::now() < deadline, "等待浏览器模拟子进程超时");
            std::thread::sleep(Duration::from_millis(50));
        };
        drop(job);
        assert_eq!(
            unsafe { WaitForSingleObject(child.as_raw_handle(), 2000) },
            0
        );
        assert_eq!(
            unsafe { WaitForSingleObject(descendant.as_raw_handle(), 2000) },
            0
        );
        child.wait().unwrap();
    }
}
