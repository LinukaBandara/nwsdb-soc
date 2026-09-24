using Microsoft.AspNetCore.Identity;
using NWSDB.IdentityService.Models;

namespace NWSDB.IdentityService.Data;

public static class IdentityDbInitializer
{
    public static void Seed(IdentityDbContext db)
    {
        if (db.UserAccounts.Any())
            return;

        var passwordHasher = new PasswordHasher<UserAccount>();

        var users = new[]
        {
            CreateUser(passwordHasher, "NWSDB Administrator", "admin@nwsdb.local", "Admin", null, "Admin@123"),
            CreateUser(passwordHasher, "NWSDB Staff", "staff@nwsdb.local", "Staff", null, "Staff@123"),
            CreateUser(passwordHasher, "NWSDB Partner", "partner@nwsdb.local", "Partner", null, "Partner@123")
        };

        db.UserAccounts.AddRange(users);
        db.SaveChanges();
    }

    private static UserAccount CreateUser(
        PasswordHasher<UserAccount> passwordHasher,
        string fullName,
        string email,
        string role,
        string? accountNumber,
        string password)
    {
        var user = new UserAccount
        {
            FullName = fullName,
            Email = email,
            Role = role,
            AccountNumber = accountNumber
        };

        user.PasswordHash = passwordHasher.HashPassword(user, password);
        return user;
    }
}
