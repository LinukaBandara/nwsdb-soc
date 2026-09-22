using Microsoft.EntityFrameworkCore;
using NWSDB.PaymentService.Models;

namespace NWSDB.PaymentService.Services;

public class PaymentService : IPaymentService
{
    private readonly PaymentDbContext _db;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(PaymentDbContext db, ILogger<PaymentService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<Payment> CreatePaymentAsync(CreatePaymentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountNumber))
            throw new ArgumentException("Account number is required.");

        if (request.Amount <= 0)
            throw new ArgumentException("Payment amount must be greater than zero.");

        if (string.IsNullOrWhiteSpace(request.Channel))
            throw new ArgumentException("Payment channel is required.");

        var payment = new Payment
        {
            AccountNumber = request.AccountNumber.Trim(),
            Amount = request.Amount,
            Channel = request.Channel.Trim(),
            Status = PaymentStatus.Pending
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        // The gateway step is simulated for this assignment.
        payment.Status = PaymentStatus.Completed;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Payment {Reference} for account {Account} processed via {Channel}",
            payment.ReferenceNumber,
            payment.AccountNumber,
            payment.Channel);

        return payment;
    }

    public async Task<Payment> CreatePendingPaymentAsync(CreatePaymentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountNumber)) throw new ArgumentException("Account number is required.");
        if (request.Amount <= 0) throw new ArgumentException("Payment amount must be greater than zero.");
        if (string.IsNullOrWhiteSpace(request.Channel)) throw new ArgumentException("Payment channel is required.");

        var payment = new Payment { AccountNumber = request.AccountNumber.Trim(), Amount = request.Amount, Channel = request.Channel.Trim(), Status = PaymentStatus.Pending };
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();
        return payment;
    }

    public async Task<Payment?> UpdateStatusByReferenceAsync(string referenceNumber, PaymentStatus status)
    {
        var payment = await _db.Payments.FirstOrDefaultAsync(p => p.ReferenceNumber == referenceNumber);
        if (payment is null) return null;
        payment.Status = status;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Payment {Reference} updated to {Status} by PayHere notification", referenceNumber, status);
        return payment;
    }

    public async Task<Payment?> GetPaymentAsync(int id) =>
        await _db.Payments.FindAsync(id);

    public async Task<IReadOnlyList<Payment>> GetPaymentsForAccountAsync(string accountNumber) =>
        await _db.Payments
            .Where(p => p.AccountNumber == accountNumber)
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync();

    public async Task<Payment?> UpdateStatusAsync(int id, PaymentStatus status)
    {
        var payment = await _db.Payments.FindAsync(id);
        if (payment is null) return null;

        payment.Status = status;
        await _db.SaveChangesAsync();
        return payment;
    }
}
