using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NWSDB.IdentityService.Data;
using NWSDB.IdentityService.Models;

namespace NWSDB.IdentityService.Services;

public interface IUserAccountService
{
    UserAccount? FindByEmail(string email);
    UserAccount? FindById(int id);
    UserAccount CreateCustomer(RegisterRequest request);
    bool VerifyPassword(UserAccount user, string password);
    IReadOnlyCollection<UserAccount> GetAll();
    UserAccount CreateManagedUser(CreateManagedUserRequest request);
    bool LinkAccount(UserAccount user, string accountNumber);
}

public class UserAccountService(IdentityDbContext db) : IUserAccountService
{
    private readonly PasswordHasher<UserAccount> _passwordHasher = new();

    public UserAccount? FindByEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email)
            ? db.UserAccounts.FirstOrDefault(u => u.Email == email.Trim())
            : null;

    public UserAccount CreateCustomer(RegisterRequest request)
    {
        var email = request.Email.Trim();

        if (db.UserAccounts.Any(u => u.Email == email))
            throw new InvalidOperationException("An account with this email already exists.");

        var user = new UserAccount
        {
            FullName = request.FullName.Trim(),
            Email = email,
            Role = "Customer",
            AccountNumber = null
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        db.UserAccounts.Add(user);
        db.SaveChanges();

        return user;
    }

    public UserAccount? FindById(int id) =>
        db.UserAccounts.FirstOrDefault(user => user.Id == id);

    public bool LinkAccount(UserAccount user, string accountNumber)
    {
        var normalized = accountNumber.Trim();

        if (string.IsNullOrWhiteSpace(normalized))
            return false;

        user.AccountNumber = normalized;
        db.SaveChanges();

        return true;
    }

    public IReadOnlyCollection<UserAccount> GetAll() =>
        db.UserAccounts
            .AsNoTracking()
            .OrderBy(u => u.Id)
            .ToArray();

    public UserAccount CreateManagedUser(CreateManagedUserRequest request)
    {
        var email = request.Email.Trim();

        if (db.UserAccounts.Any(u => u.Email == email))
            throw new InvalidOperationException("An account with this email already exists.");

        var role = request.Role.Trim();

        if (role is not ("Customer" or "Staff" or "Admin" or "Partner"))
            throw new InvalidOperationException("Role must be Customer, Staff, Admin or Partner.");

        var user = new UserAccount
        {
            FullName = request.FullName.Trim(),
            Email = email,
            Role = role,
            AccountNumber = string.IsNullOrWhiteSpace(request.AccountNumber)
                ? null
                : request.AccountNumber.Trim()
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        db.UserAccounts.Add(user);
        db.SaveChanges();

        return user;
    }

    public bool VerifyPassword(UserAccount user, string password) =>
        _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password)
        == PasswordVerificationResult.Success;
}
