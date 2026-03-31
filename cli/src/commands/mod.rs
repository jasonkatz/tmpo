pub mod login;
pub mod logout;
pub mod whoami;

pub struct Context {
    pub base_url: String,
    pub json: bool,
}
