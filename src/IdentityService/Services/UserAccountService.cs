using System.Collections.Concurrent;
using Microsoft.AspNetCore.Identity;
using NWSDB.IdentityService.Models;

namespace NWSDB.IdentityService.Services;

public interface IUserAccountService
{
    UserAccount? FindByEmail(string email);
    UserAccount CreateCustomer(RegisterRequest request);
    bool VerifyPassword(UserAccount user, string password);
    IReadOnlyCollection<UserAccount> GetAll();
    UserAccount CreateManagedUser(CreateManagedUserRequest request);
}

public class UserAccountService : IUserAccountService
{
    private readonly ConcurrentDictionary<string, UserAccount> _users = new(StringComparer.OrdinalIgnoreCase);
    private readonly PasswordHasher<UserAccount> _passwordHasher = new();
    private int _nextId = 3;

    public UserAccountService()
    {
        AddSeedUser(1, "NWSDB Administrator", "admin@nwsdb.local", "Admin", null, "Admin@123");
        AddSeedUser(2, "NWSDB Staff", "staff@nwsdb.local", "Staff", null, "Staff@123");
        AddSeedUser(3, "NWSDB Partner", "partner@nwsdb.local", "Partner", null, "Partner@123");
    }

    public UserAccount? FindByEmail(string email) =>
        _users.TryGetValue(email.Trim(), out var user) ? user : null;

    public UserAccount CreateCustomer(RegisterRequest request)
    {
        var email = request.Email.Trim();

        if (_users.ContainsKey(email))
            throw new InvalidOperationException("An account with this email already exists.");

        var user = new UserAccount
        {
            Id = Interlocked.Increment(ref _nextId),
            FullName = request.FullName.Trim(),
            Email = email,
            Role = "Customer",
            AccountNumber = request.AccountNumber.Trim()
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        _users[email] = user;
        return user;
    }

    public IReadOnlyCollection<UserAccount> GetAll() => _users.Values.OrderBy(u => u.Id).ToArray();

    public UserAccount CreateManagedUser(CreateManagedUserRequest request)
    {
        var email = request.Email.Trim();

        if (_users.ContainsKey(email))
            throw new InvalidOperationException("An account with this email already exists.");

        var role = request.Role.Trim();
        if (role is not ("Customer" or "Staff" or "Admin" or "Partner"))
            throw new InvalidOperationException("Role must be Customer, Staff, Admin or Partner.");

        var user = new UserAccount
        {
            Id = Interlocked.Increment(ref _nextId),
            FullName = request.FullName.Trim(),
            Email = email,
            Role = role,
            AccountNumber = string.IsNullOrWhiteSpace(request.AccountNumber)
                ? null
                : request.AccountNumber.Trim()
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        _users[email] = user;
        return user;
    }

    public bool VerifyPassword(UserAccount user, string password) =>
        _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password)
        == PasswordVerificationResult.Success;

    private void AddSeedUser(
        int id,
        string fullName,
        string email,
        string role,
        string? accountNumber,
        string password)
    {
        var user = new UserAccount
        {
            Id = id,
            FullName = fullName,
            Email = email,
            Role = role,
            AccountNumber = accountNumber
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, password);
        _users[email] = user;
    }
}
