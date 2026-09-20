using Microsoft.EntityFrameworkCore;
using NWSDB.UsageService.Models;
using NWSDB.UsageService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "NWSDB Usage Service", Version = "v1" });
});

// EF Core InMemory is used for the academic demonstration.
builder.Services.AddDbContext<UsageDbContext>(options =>
    options.UseInMemoryDatabase("UsageServiceDb"));

builder.Services.AddScoped<IUsageService, NWSDB.UsageService.Services.UsageService>();

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
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "UsageService" }));

// Seed sample readings so the customer client has data during a demo.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<UsageDbContext>();
    db.Readings.AddRange(
        new MeterReading { AccountNumber = "NWSDB-0001", CubicMetres = 120, ReadingDateUtc = DateTime.UtcNow.AddDays(-30) },
        new MeterReading { AccountNumber = "NWSDB-0001", CubicMetres = 145, ReadingDateUtc = DateTime.UtcNow }
    );
    db.SaveChanges();
}

app.Run();

// Exposed for WebApplicationFactory integration tests.
public partial class Program { }
