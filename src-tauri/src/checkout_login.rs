//! 自动登录信息保存在软件配置目录的独立文件中，不读取系统钥匙串。
//! 密码不并入通用 Settings，也不通过状态查询返回前端或写入活动日志。
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use apw_core::config::SettingsStore;
use serde::{Deserialize, Serialize};

const LOGIN_FILE: &str = "checkout-login.json";
const MAX_LOGIN_BYTES: u64 = 16 * 1024;

#[derive(Deserialize, Serialize)]
pub(crate) struct Login {
    pub account: String,
    pub password: String,
}

impl Login {
    fn normalized(mut self) -> Result<Self, String> {
        self.account = self.account.trim().to_owned();
        if self.account.is_empty() || self.password.is_empty() {
            return Err("请填写 Apple 账户和密码".into());
        }
        Ok(self)
    }
}

fn login_path() -> Result<PathBuf, String> {
    SettingsStore::new()
        .map(|store| store.path().with_file_name(LOGIN_FILE))
        .map_err(|_| "无法确定软件配置目录".into())
}

fn load_from(path: &Path) -> Result<Option<Login>, String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err("无法读取自动登录配置，请检查文件权限".into()),
    };
    if !metadata.is_file() {
        return Err("自动登录配置必须是普通文件".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|_| "无法限制自动登录配置的访问权限".to_string())?;
    }
    let mut bytes = Vec::new();
    File::open(path)
        .and_then(|file| file.take(MAX_LOGIN_BYTES + 1).read_to_end(&mut bytes))
        .map_err(|_| "无法读取自动登录配置，请检查文件权限".to_string())?;
    if bytes.len() as u64 > MAX_LOGIN_BYTES {
        return Err("自动登录配置过大，请重新保存".into());
    }
    // 解析错误不附带原始内容，避免损坏的 JSON 把密码带进日志。
    let login: Login = serde_json::from_slice(&bytes)
        .map_err(|_| "自动登录配置格式错误，请重新保存".to_string())?;
    login.normalized().map(Some)
}

fn save_to(path: &Path, login: Login) -> Result<(), String> {
    let login = login.normalized()?;
    let bytes =
        serde_json::to_vec_pretty(&login).map_err(|_| "无法保存自动登录配置".to_string())?;
    if bytes.len() as u64 > MAX_LOGIN_BYTES {
        return Err("自动登录信息过长".into());
    }
    let dir = path.parent().ok_or("无法确定软件配置目录")?;
    fs::create_dir_all(dir).map_err(|_| "无法创建软件配置目录".to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(dir, fs::Permissions::from_mode(0o700))
            .map_err(|_| "无法限制配置目录的访问权限".to_string())?;
    }
    let mut temporary =
        tempfile::NamedTempFile::new_in(dir).map_err(|_| "无法创建自动登录配置".to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        temporary
            .as_file()
            .set_permissions(fs::Permissions::from_mode(0o600))
            .map_err(|_| "无法限制自动登录配置的访问权限".to_string())?;
    }
    temporary
        .write_all(&bytes)
        .and_then(|_| temporary.as_file().sync_all())
        .map_err(|_| "无法写入自动登录配置".to_string())?;
    temporary
        .persist(path)
        .map_err(|_| "无法替换自动登录配置".to_string())?;
    Ok(())
}

fn clear_from(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err("无法移除自动登录配置，请检查文件权限".into()),
    }
}

pub(crate) fn load() -> Result<Option<Login>, String> {
    load_from(&login_path()?)
}

#[derive(Serialize)]
pub(crate) struct LoginStatus {
    saved: bool,
}

#[tauri::command]
pub(crate) fn checkout_login_status() -> Result<LoginStatus, String> {
    Ok(LoginStatus {
        saved: load()?.is_some(),
    })
}

#[tauri::command]
pub(crate) fn save_checkout_login(account: String, password: String) -> Result<(), String> {
    save_to(&login_path()?, Login { account, password })
}

#[tauri::command]
pub(crate) fn clear_checkout_login() -> Result<(), String> {
    clear_from(&login_path()?)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn login(password: &str) -> Login {
        Login {
            account: " test@example.test ".into(),
            password: password.into(),
        }
    }

    #[test]
    fn 配置可保存更新读取清除且密码空白不会被裁剪() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(LOGIN_FILE);
        assert!(load_from(&path).unwrap().is_none());
        save_to(&path, login("  synthetic test password  ")).unwrap();
        let loaded = load_from(&path).unwrap().unwrap();
        assert_eq!(loaded.account, "test@example.test");
        assert_eq!(loaded.password, "  synthetic test password  ");
        save_to(&path, login("replacement")).unwrap();
        assert_eq!(load_from(&path).unwrap().unwrap().password, "replacement");
        clear_from(&path).unwrap();
        assert!(load_from(&path).unwrap().is_none());
        clear_from(&path).unwrap();
    }

    #[test]
    fn 损坏或过大的配置不泄漏内容且无效输入不覆盖原配置() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(LOGIN_FILE);
        fs::write(&path, b"synthetic-private-content").unwrap();
        assert_eq!(
            load_from(&path).err().unwrap(),
            "自动登录配置格式错误，请重新保存"
        );
        fs::write(&path, vec![b'x'; MAX_LOGIN_BYTES as usize + 1]).unwrap();
        assert_eq!(
            load_from(&path).err().unwrap(),
            "自动登录配置过大，请重新保存"
        );
        save_to(&path, login("original")).unwrap();
        assert!(save_to(&path, login("")).is_err());
        assert_eq!(load_from(&path).unwrap().unwrap().password, "original");
        assert_eq!(
            serde_json::to_value(LoginStatus { saved: true }).unwrap(),
            serde_json::json!({"saved":true})
        );
    }

    #[cfg(unix)]
    #[test]
    fn 配置仅限当前用户读取且拒绝符号链接() {
        use std::os::unix::fs::{PermissionsExt, symlink};
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(LOGIN_FILE);
        save_to(&path, login("synthetic-secret")).unwrap();
        assert_eq!(
            fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o600
        );
        assert_eq!(
            fs::metadata(dir.path()).unwrap().permissions().mode() & 0o777,
            0o700
        );
        fs::set_permissions(&path, fs::Permissions::from_mode(0o644)).unwrap();
        assert!(load_from(&path).unwrap().is_some());
        assert_eq!(
            fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o600
        );
        let linked = dir.path().join("linked.json");
        symlink(&path, &linked).unwrap();
        assert!(load_from(&linked).is_err());
    }
}
