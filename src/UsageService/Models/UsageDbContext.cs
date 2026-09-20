using Microsoft.EntityFrameworkCore;

namespace NWSDB.UsageService.Models;

public class UsageDbContext : DbContext
{
    public UsageDbContext(DbContextOptions<UsageDbContext> options) : base(options) { }

    public DbSet<MeterReading> Readings => Set<MeterReading>();
}
