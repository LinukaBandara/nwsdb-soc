namespace NWSDB.UsageService.Models;

public class MeterReading
{
    public int Id { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public double CubicMetres { get; set; }
    public DateTime ReadingDateUtc { get; set; } = DateTime.UtcNow;
}