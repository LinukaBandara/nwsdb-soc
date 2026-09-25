namespace NWSDB.IdentityService.DTOs;

public record RegisterRequest(string FullName, string Email, string Password);

public record LinkAccountRequest(string AccountNumber);

public record LoginRequest(string? Email, string? Password);

public record CreateManagedUserRequest(
    string FullName,
    string Email,
    string Password,
    string Role,
    string? AccountNumber);

public record AuthResponse(
    string Token,
    DateTime ExpiresAtUtc,
    int UserId,
    string FullName,
    string Email,
    string Role,
    string? AccountNumber);