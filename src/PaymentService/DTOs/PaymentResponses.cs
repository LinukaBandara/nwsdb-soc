using NWSDB.PaymentService.Models;

namespace NWSDB.PaymentService.DTOs;

public record PaymentResponse(
    int Id,
    string AccountNumber,
    decimal Amount,
    string Channel,
    string Status,
    string ReferenceNumber,
    DateTime CreatedAtUtc)
{
    public static PaymentResponse FromEntity(Payment payment) => new(
        payment.Id,
        payment.AccountNumber,
        payment.Amount,
        payment.Channel,
        payment.Status.ToString(),
        payment.ReferenceNumber,
        payment.CreatedAtUtc);
}