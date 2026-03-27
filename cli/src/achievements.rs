use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;

use crate::config::CadenceConfig;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AchievementKind {
    FirstWorkflow,
    FirstCleanReview,
    TenWorkflows,
    SurvivedMaxIters,
    SpeedRun,
}

impl AchievementKind {
    pub fn label(&self) -> &'static str {
        match self {
            AchievementKind::FirstWorkflow => "🎯 First Pipeline",
            AchievementKind::FirstCleanReview => "💎 Zero-Comment Review",
            AchievementKind::TenWorkflows => "🏆 Workflow Veteran",
            AchievementKind::SurvivedMaxIters => "💪 Survived Max Iterations",
            AchievementKind::SpeedRun => "⚡ Speed Run",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            AchievementKind::FirstWorkflow => "Completed your first Cadence workflow",
            AchievementKind::FirstCleanReview => "PR passed review with zero comments",
            AchievementKind::TenWorkflows => "Completed 10 workflows — you're a pro",
            AchievementKind::SurvivedMaxIters => "Survived all 8 iterations and still shipped",
            AchievementKind::SpeedRun => "Passed CI, review, and E2E on the very first try",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Achievement {
    pub kind: AchievementKind,
    pub earned_at: DateTime<Utc>,
    pub workflow_id: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct AchievementStore {
    pub achievements: Vec<Achievement>,
    pub workflows_completed: u32,
}

impl AchievementStore {
    fn path() -> Result<std::path::PathBuf> {
        let dir = CadenceConfig::workflows_dir()?;
        // Store alongside workflows dir, not inside it
        let parent = dir
            .parent()
            .ok_or_else(|| anyhow::anyhow!("no parent for workflows dir"))?;
        Ok(parent.join("achievements.json"))
    }

    pub fn load() -> Result<Self> {
        let path = Self::path()?;
        if !path.exists() {
            return Ok(Self::default());
        }
        let content = fs::read_to_string(&path)?;
        Ok(serde_json::from_str(&content).unwrap_or_default())
    }

    pub fn save(&self) -> Result<()> {
        let path = Self::path()?;
        let content = serde_json::to_string_pretty(self)?;
        fs::write(path, content)?;
        Ok(())
    }

    pub fn has(&self, kind: &AchievementKind) -> bool {
        self.achievements.iter().any(|a| &a.kind == kind)
    }

    /// Award an achievement if not already earned. Returns the new achievement.
    pub fn award(&mut self, kind: AchievementKind, workflow_id: &str) -> Option<Achievement> {
        if self.has(&kind) {
            return None;
        }
        let achievement = Achievement {
            kind,
            earned_at: Utc::now(),
            workflow_id: workflow_id.to_string(),
        };
        self.achievements.push(achievement.clone());
        Some(achievement)
    }

    pub fn print_new(&self, new_ones: &[Achievement]) {
        if new_ones.is_empty() {
            return;
        }
        eprintln!("\n\x1b[1;33m🏅 Achievement(s) Unlocked!\x1b[0m");
        for a in new_ones {
            eprintln!("  {} — {}", a.kind.label(), a.kind.description());
        }
    }
}

/// Evaluate and award achievements after a workflow run completes.
pub fn evaluate(
    store: &mut AchievementStore,
    workflow_id: &str,
    iteration: u32,
    max_iters: u32,
    clean_review: bool,
) -> Vec<Achievement> {
    let mut earned = Vec::new();

    store.workflows_completed += 1;

    if let Some(a) = store.award(AchievementKind::FirstWorkflow, workflow_id) {
        earned.push(a);
    }

    if store.workflows_completed >= 10 {
        if let Some(a) = store.award(AchievementKind::TenWorkflows, workflow_id) {
            earned.push(a);
        }
    }

    if clean_review {
        if let Some(a) = store.award(AchievementKind::FirstCleanReview, workflow_id) {
            earned.push(a);
        }
    }

    // Survived means we hit the iteration ceiling
    if iteration >= max_iters {
        if let Some(a) = store.award(AchievementKind::SurvivedMaxIters, workflow_id) {
            earned.push(a);
        }
    }

    // Speed run: first iteration AND review was clean
    if iteration == 1 && clean_review {
        if let Some(a) = store.award(AchievementKind::SpeedRun, workflow_id) {
            earned.push(a);
        }
    }

    earned
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store() -> AchievementStore {
        AchievementStore::default()
    }

    #[test]
    fn award_returns_achievement_on_first_call() {
        let mut s = store();
        let result = s.award(AchievementKind::FirstWorkflow, "wf-001");
        assert!(result.is_some());
        assert_eq!(result.unwrap().workflow_id, "wf-001");
    }

    #[test]
    fn award_returns_none_when_already_earned() {
        let mut s = store();
        s.award(AchievementKind::FirstWorkflow, "wf-001");
        assert!(s.award(AchievementKind::FirstWorkflow, "wf-002").is_none());
    }

    #[test]
    fn has_false_before_award() {
        assert!(!store().has(&AchievementKind::TenWorkflows));
    }

    #[test]
    fn has_true_after_award() {
        let mut s = store();
        s.award(AchievementKind::TenWorkflows, "wf-010");
        assert!(s.has(&AchievementKind::TenWorkflows));
    }

    #[test]
    fn evaluate_awards_first_workflow() {
        let mut s = store();
        let earned = evaluate(&mut s, "wf-001", 1, 8, false);
        assert!(earned.iter().any(|a| a.kind == AchievementKind::FirstWorkflow));
    }

    #[test]
    fn evaluate_awards_ten_workflows_at_milestone() {
        let mut s = store();
        s.workflows_completed = 9;
        let earned = evaluate(&mut s, "wf-010", 1, 8, false);
        assert!(earned.iter().any(|a| a.kind == AchievementKind::TenWorkflows));
    }

    #[test]
    fn evaluate_speed_run_requires_iter_one_and_clean_review() {
        let mut s = store();
        // Rework with clean review — not a speed run
        let slow = evaluate(&mut s, "wf-slow", 3, 8, true);
        assert!(!slow.iter().any(|a| a.kind == AchievementKind::SpeedRun));

        let mut s2 = store();
        let fast = evaluate(&mut s2, "wf-fast", 1, 8, true);
        assert!(fast.iter().any(|a| a.kind == AchievementKind::SpeedRun));
    }

    #[test]
    fn evaluate_survived_max_iters() {
        let mut s = store();
        let earned = evaluate(&mut s, "wf-hard", 8, 8, false);
        assert!(earned
            .iter()
            .any(|a| a.kind == AchievementKind::SurvivedMaxIters));
    }

    #[test]
    fn all_kinds_have_non_empty_label_and_description() {
        for kind in [
            AchievementKind::FirstWorkflow,
            AchievementKind::FirstCleanReview,
            AchievementKind::TenWorkflows,
            AchievementKind::SurvivedMaxIters,
            AchievementKind::SpeedRun,
        ] {
            assert!(!kind.label().is_empty());
            assert!(!kind.description().is_empty());
        }
    }

    #[test]
    fn serializes_kind_to_kebab_case() {
        assert_eq!(
            serde_json::to_string(&AchievementKind::FirstWorkflow).unwrap(),
            "\"first-workflow\""
        );
    }
}
