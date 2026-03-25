use reqwest::Client;
use serde::de::DeserializeOwned;

use crate::config::Credentials;

pub struct ApiClient {
    client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.to_string(),
        }
    }

    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> anyhow::Result<T> {
        let creds = Credentials::load()?;
        let token = creds
            .access_token
            .ok_or_else(|| anyhow::anyhow!("Not authenticated. Run 'jk login' first."))?;

        let response = self
            .client
            .get(format!("{}{}", self.base_url, path))
            .bearer_auth(&token)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            anyhow::bail!("Request failed ({}): {}", status, text);
        }

        Ok(response.json().await?)
    }

    #[allow(dead_code)]
    pub async fn post<T: DeserializeOwned>(&self, path: &str) -> anyhow::Result<T> {
        let creds = Credentials::load()?;
        let token = creds
            .access_token
            .ok_or_else(|| anyhow::anyhow!("Not authenticated. Run 'jk login' first."))?;

        let response = self
            .client
            .post(format!("{}{}", self.base_url, path))
            .bearer_auth(&token)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            anyhow::bail!("Request failed ({}): {}", status, text);
        }

        Ok(response.json().await?)
    }
}
