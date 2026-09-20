using Microsoft.EntityFrameworkCore;
using NWSDB.PaymentService.Models;
using NWSDB.PaymentService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "NWSDB Payment Service", Version = "v1" });
});

// EF Core InMemory is used for the academic demonstration.
// A persistent provider can be configured without changing the service layer.
builder.Services.AddDbContext<PaymentDbContext>(options =>
    options.UseInMemoryDatabase("PaymentServiceDb"));

builder.Services.AddScoped<IPaymentService, NWSDB.PaymentService.Services.PaymentService>();

// Allow the React client to call the API during local development.
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

// Health endpoint used by Docker/Kubernetes probes.
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "PaymentService" }));

app.Run();

// Exposed for WebApplicationFactory integration tests.
public partial class Program { }
