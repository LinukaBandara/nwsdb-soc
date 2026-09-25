using Microsoft.EntityFrameworkCore;
using NWSDB.UsageService.Models;

namespace NWSDB.UsageService.Data;

public class UsageDbContext : DbContext
{
    public UsageDbContext(DbContextOptions<UsageDbContext> options) : base(options)
    {
    }

    public DbSet<MeterReading> Readings => Set<MeterReading>();
}