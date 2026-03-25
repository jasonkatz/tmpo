use serde::Serialize;

pub fn print_json<T: Serialize>(value: &T) -> anyhow::Result<()> {
    println!("{}", serde_json::to_string_pretty(value)?);
    Ok(())
}

pub fn print_table(headers: &[&str], rows: Vec<Vec<String>>) {
    let mut widths: Vec<usize> = headers.iter().map(|h| h.len()).collect();

    for row in &rows {
        for (i, cell) in row.iter().enumerate() {
            if i < widths.len() && cell.len() > widths[i] {
                widths[i] = cell.len();
            }
        }
    }

    let header_line: String = headers
        .iter()
        .enumerate()
        .map(|(i, h)| format!("{:width$}", h, width = widths[i]))
        .collect::<Vec<_>>()
        .join("  ");
    println!("{}", header_line);

    let separator: String = widths.iter().map(|w| "-".repeat(*w)).collect::<Vec<_>>().join("  ");
    println!("{}", separator);

    for row in rows {
        let line: String = row
            .iter()
            .enumerate()
            .map(|(i, cell)| {
                let width = widths.get(i).copied().unwrap_or(0);
                format!("{:width$}", cell, width = width)
            })
            .collect::<Vec<_>>()
            .join("  ");
        println!("{}", line);
    }
}

pub fn print_success(message: &str) {
    println!("{}", message);
}

pub fn print_error(message: &str) {
    eprintln!("Error: {}", message);
}
