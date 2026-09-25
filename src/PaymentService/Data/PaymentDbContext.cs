using Microsoft.EntityFrameworkCore;
using NWSDB.PaymentService.Models;

namespace NWSDB.PaymentService.Data;

public class PaymentDbContext : DbContext
{
    public PaymentDbContext(DbContextOptions<PaymentDbContext> options) : base(options)
    {
    }

    public DbSet<Payment> Payments => Set<Payment>();
}