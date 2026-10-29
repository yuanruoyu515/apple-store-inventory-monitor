//! 与平台无关的浏览器归属判断和启动错误文案。
#[cfg(any(windows, test))]
use std::path::Path;

/// 只承认本应用实际使用的完整启动参数；目录名称的子串不能证明归属。
#[cfg(any(windows, test))]
pub(crate) fn is_owned_browser_command(name: &str, args: &[String], profile: &Path) -> bool {
    let normalized_profile = profile.to_string_lossy().replace('\\', "/");
    let profile_arg = format!("--user-data-dir={normalized_profile}");
    ["chrome.exe", "msedge.exe", "chromium.exe"]
        .iter()
        .any(|browser| name.eq_ignore_ascii_case(browser))
        && args
            .iter()
            .any(|arg| arg.replace('\\', "/").eq_ignore_ascii_case(&profile_arg))
        && args
            .iter()
            .any(|arg| arg == "--remote-debugging-address=127.0.0.1")
        && args.iter().any(|arg| {
            arg.strip_prefix("--remote-debugging-port=")
                .and_then(|port| port.parse::<u16>().ok())
                .is_some_and(|port| port != 0)
        })
        && !args.iter().any(|arg| arg.starts_with("--type="))
}

pub(crate) fn startup_exit_detail(code: Option<i32>, stderr: &str) -> String {
    let lower = stderr.to_ascii_lowercase();
    let permission_denied = lower.contains("access is denied")
        || lower.contains("permission denied")
        || lower.contains("拒绝访问");
    let message = if permission_denied {
        "系统拒绝访问浏览器专属资料目录。请检查目录权限和安全软件的拦截记录"
    } else if code == Some(21) {
        "浏览器专属资料目录被占用，或无法取得目录锁。请确认没有其他果到雷达实例正在运行"
    } else {
        "查询浏览器启动后退出，尚未取得库存。请查看启动诊断，确认 Chrome 或 Edge 可以正常运行"
    };
    match code {
        Some(code) => format!("{message}（退出码 {code}）"),
        None => message.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(profile: &str) -> Vec<String> {
        vec![
            "chrome.exe".into(),
            format!("--user-data-dir={profile}"),
            "--remote-debugging-address=127.0.0.1".into(),
            "--remote-debugging-port=12345".into(),
        ]
    }

    #[test]
    fn only_exact_owned_profile_and_root_process_can_be_reclaimed() {
        let profile = Path::new("C:\\Users\\Test User\\chromium-profile-v1");
        let valid = args("C:\\Users\\Test User\\chromium-profile-v1");
        assert!(is_owned_browser_command("chrome.exe", &valid, profile));
        assert!(!is_owned_browser_command("other.exe", &valid, profile));
        assert!(!is_owned_browser_command(
            "chrome.exe",
            &args("C:\\Users\\Test User\\chromium-profile-v1-copy"),
            profile
        ));
        let mut renderer = valid.clone();
        renderer.push("--type=renderer".into());
        assert!(!is_owned_browser_command("chrome.exe", &renderer, profile));
        let mut ordinary = valid;
        ordinary.retain(|arg| !arg.starts_with("--remote-debugging-port="));
        assert!(!is_owned_browser_command("chrome.exe", &ordinary, profile));
    }

    #[test]
    fn exit_21_does_not_guess_who_owns_the_profile() {
        let detail = startup_exit_detail(Some(21), "");
        assert!(detail.contains("被占用，或无法取得目录锁"));
        assert!(!detail.contains("已清理"));
        assert!(startup_exit_detail(Some(21), "Access is denied").contains("系统拒绝访问"));
    }
}
