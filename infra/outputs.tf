output "project_id" {
  description = "Railway project ID"
  value       = railway_project.this.id
}

output "server_service_id" {
  description = "Server service ID (needed for RAILWAY_SERVICE_ID in GHA)"
  value       = railway_service.server.id
}

output "server_domain" {
  description = "Public server domain"
  value       = railway_service_domain.server.domain
}

output "postgres_service_id" {
  description = "Postgres service ID"
  value       = railway_service.postgres.id
}
