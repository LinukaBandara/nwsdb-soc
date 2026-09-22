namespace NWSDB.IdentityService.Models;

public class UserAccount
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Customer";
    public string? AccountNumber { get; set; }
}

public record RegisterRequest(string FullName, string Email, string Password, string AccountNumber);

public record LoginRequest(string Email, string Password);

public record AuthResponse(
    string Token,
    DateTime ExpiresAtUtc,
    int UserId,
    string FullName,
    string Email,
    string Role,
    string? AccountNumber);
