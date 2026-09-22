using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NWSDB.UsageService.Models;
using NWSDB.UsageService.Services;

var builder = WebApplication.CreateBuilder(args);

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? builder.Configuration["JWT_KEY"]
    ?? throw new InvalidOperationException("JWT signing key is not configured. Set Jwt__Key (or JWT_KEY) in the service environment.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? builder.Configuration["JWT_ISSUER"]
    ?? "NWSDB.IdentityService";

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? builder.Configuration["JWT_AUDIENCE"]
    ?? "NWSDB.SOC";

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException("JWT signing key is too short. Configure the same strong signing key used by IdentityService.");
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "NWSDB Usage Service", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = System.Security.Claims.ClaimTypes.Name
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("NWSDB.UsageService.Jwt");

                logger.LogError(
                    context.Exception,
                    "JWT authentication failed. Issuer={Issuer}, Audience={Audience}, KeyLength={KeyLength}",
                    jwtIssuer,
                    jwtAudience,
                    jwtKey.Length);

                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("NWSDB.UsageService.Jwt");

                logger.LogInformation(
                    "JWT validated successfully. Subject={Subject}, Role={Role}",
                    context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value);

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "UsageService" }));

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<UsageDbContext>();
    if (!db.Readings.Any())
    {
        db.Readings.AddRange(
            new MeterReading { AccountNumber = "NWSDB-0001", CubicMetres = 120, ReadingDateUtc = DateTime.UtcNow.AddDays(-30) },
            new MeterReading { AccountNumber = "NWSDB-0001", CubicMetres = 145, ReadingDateUtc = DateTime.UtcNow }
        );
        db.SaveChanges();
    }
}

app.Run();

public partial class Program { }
