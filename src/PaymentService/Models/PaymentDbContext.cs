using Microsoft.EntityFrameworkCore;

namespace NWSDB.PaymentService.Models;

public class PaymentDbContext : DbContext
{
    public PaymentDbContext(DbContextOptions<PaymentDbContext> options) : base(options) { }

    public DbSet<Payment> Payments => Set<Payment>();
}
