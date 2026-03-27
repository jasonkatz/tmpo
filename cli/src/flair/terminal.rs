/// Print a stage transition banner.
pub fn print_stage_banner(stage_label: &str, message: &str) {
    let line = format!("  {stage_label}: {message}");
    let width = line.len().max(44);
    let bar = "═".repeat(width + 2);
    eprintln!("\n\x1b[1;35m╔{bar}╗\x1b[0m");
    eprintln!("\x1b[1;35m║  {:<width$}  ║\x1b[0m", format!("{stage_label}: {message}"), width = width);
    eprintln!("\x1b[1;35m╚{bar}╝\x1b[0m");
}

/// Print an ASCII progress bar showing pipeline stage completion.
pub fn print_progress_bar(completed: u32, total: u32, label: &str) {
    let width = 30usize;
    let filled = if total == 0 {
        0
    } else {
        ((completed as f64 / total as f64) * width as f64) as usize
    };
    let filled = filled.min(width);
    let empty = width - filled;
    let bar = format!("{}{}", "█".repeat(filled), "░".repeat(empty));
    eprintln!("\n  \x1b[36m[{bar}] {completed}/{total} {label}\x1b[0m");
}

/// Print ASCII confetti for a first-try pipeline pass.
pub fn print_confetti() {
    eprintln!("\n\x1b[1;33m");
    eprintln!("  🎊  FIRST-TRY PASS! CONFETTI TIME!  🎊");
    eprintln!();
    eprintln!("    * . · * ✦ * ·  . * ✦  · * . ✦");
    eprintln!("  · ✦ * . · ✦ *   ✦ * . · * ✦ * .");
    eprintln!("    ░▒▓ CLEAN SHIP ON THE FIRST TRY ▓▒░");
    eprintln!("  · ✦ * . · ✦ *   ✦ * . · * ✦ * .");
    eprintln!("    * . · * ✦ * ·  . * ✦  · * . ✦");
    eprintln!("\x1b[0m");
}

/// Print a sad trombone banner when max iterations are hit.
pub fn print_sad_trombone() {
    eprintln!("\n\x1b[1;31m");
    eprintln!("  ┌───────────────────────────────────┐");
    eprintln!("  │        MAX ITERATIONS HIT          │");
    eprintln!("  │                                    │");
    eprintln!("  │  wah... wah... wah... waaah...     │");
    eprintln!("  │              (╥_╥)                 │");
    eprintln!("  │  Even the best crews hit walls.    │");
    eprintln!("  └───────────────────────────────────┘");
    eprintln!("\x1b[0m");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn progress_bar_zero_total_does_not_panic() {
        print_progress_bar(0, 0, "stages");
    }

    #[test]
    fn progress_bar_completed_equals_total_does_not_panic() {
        print_progress_bar(5, 5, "stages");
    }

    #[test]
    fn progress_bar_partial_does_not_panic() {
        print_progress_bar(2, 5, "stages");
    }

    #[test]
    fn progress_bar_over_total_does_not_panic() {
        // Guard: completed > total should not overflow
        print_progress_bar(6, 5, "stages");
    }

    #[test]
    fn confetti_does_not_panic() {
        print_confetti();
    }

    #[test]
    fn sad_trombone_does_not_panic() {
        print_sad_trombone();
    }

    #[test]
    fn stage_banner_does_not_panic() {
        print_stage_banner("Dev", "Let's go!");
    }

    #[test]
    fn stage_banner_long_message_does_not_panic() {
        print_stage_banner(
            "Verification",
            "Running all E2E journeys against the deployed app",
        );
    }
}
