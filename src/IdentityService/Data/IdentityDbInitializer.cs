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
            CreateUser(passwordHasher, 1, "NWSDB Administrator", "admin@nwsdb.local", "Admin", null, "Admin@123"),
            CreateUser(passwordHasher, 2, "NWSDB Staff", "staff@nwsdb.local", "Staff", null, "Staff@123"),
            CreateUser(passwordHasher, 3, "NWSDB Partner", "partner@nwsdb.local", "Partner", null, "Partner@123")
        };

        db.UserAccounts.AddRange(users);
        db.SaveChanges();
    }

    private static UserAccount CreateUser(
        PasswordHasher<UserAccount> passwordHasher,
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

        user.PasswordHash = passwordHasher.HashPassword(user, password);
        return user;
    }
}
