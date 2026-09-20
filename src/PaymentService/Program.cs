using Microsoft.EntityFrameworkCore;
using NWSDB.PaymentService.Models;
using NWSDB.PaymentService.Services;

var builder = WebApplication.CreateBuilder(args);

// --- Services (Dependency Injection) ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "NWSDB Payment Service", Version = "v1" });
});

// In-memory DB stands in for a real SQL Server / PostgreSQL instance in
// production. Swapping the provider is a one-line change — the rest of the
// service is unaffected, demonstrating the loose coupling SOA promotes.
builder.Services.AddDbContext<PaymentDbContext>(options =>
    options.UseInMemoryDatabase("PaymentServiceDb"));

builder.Services.AddScoped<IPaymentService, NWSDB.PaymentService.Services.PaymentService>();

// Allow the client app (served from a different origin) to call this API.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClient", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowClient");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Simple health-check endpoint used by the container orchestrator
// (Docker/Kubernetes liveness probe) — see Task 4 deployment discussion.
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "PaymentService" }));

app.Run();

// Exposed for WebApplicationFactory in integration tests.
public partial class Program { }
