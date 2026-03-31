use clap::{Parser, Subcommand};
use std::process;

mod api;
mod commands;
mod config;
mod output;

use commands::{login, logout, whoami};

#[derive(Parser)]
#[command(name = "cadence")]
#[command(about = "Command-line interface for Cadence")]
#[command(version)]
struct Cli {
    /// Use localhost:8080 instead of production
    #[arg(short, long, global = true)]
    local: bool,

    /// Output structured JSON (for scripting and automation)
    #[arg(long, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Authenticate via browser (opens Auth0 device flow)
    Login,
    /// Clear stored credentials
    Logout,
    /// Display current user info
    Whoami,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    const API_URL: &str = match option_env!("API_URL") {
        Some(v) => v,
        None => "https://api.yourapp.com",
    };

    let base_url = if cli.local {
        "http://localhost:8080".to_string()
    } else {
        API_URL.to_string()
    };

    let ctx = commands::Context {
        base_url,
        json: cli.json,
    };

    let result = match cli.command {
        Commands::Login => login::run(&ctx).await,
        Commands::Logout => logout::run(&ctx).await,
        Commands::Whoami => whoami::run(&ctx).await,
    };

    if let Err(err) = result {
        output::print_error(&err.to_string());
        process::exit(1);
    }
}
