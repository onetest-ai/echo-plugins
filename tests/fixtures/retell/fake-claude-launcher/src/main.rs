//! `claude.exe` for the Retell cases on Windows: `python -I <its folder>/fake_claude.py <its arguments>`, stdin, stdout
//! and stderr passed through, its exit code returned. Never a real Claude Code.
use std::process::{exit, Command};

fn main() {
    let exe = std::env::current_exe().expect("own path");
    let fake = exe.with_file_name("fake_claude.py");
    let python = std::env::var("RETELL_FAKE_PYTHON").unwrap_or_else(|_| "python".into());
    let status = Command::new(python).arg("-I").arg(&fake).args(std::env::args_os().skip(1)).status();
    match status {
        Ok(s) => exit(s.code().unwrap_or(1)),
        Err(e) => {
            eprintln!("fake claude: can't run python: {e}");
            exit(1)
        }
    }
}
