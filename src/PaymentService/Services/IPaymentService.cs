using NWSDB.PaymentService.Models;

namespace NWSDB.PaymentService.Services;

/// <summary>
/// Defines the payment operations exposed as a service contract.
/// Separating this interface from PaymentsController keeps the
/// business logic reusable/testable independent of HTTP concerns,
/// and lets it be consumed by any transport (REST today, gRPC/queue later)
/// without change — a key reusability/maintainability requirement.
/// </summary>
public interface IPaymentService
{
    Task<Payment> CreatePaymentAsync(CreatePaymentRequest request);
    Task<Payment?> GetPaymentAsync(int id);
    Task<IReadOnlyList<Payment>> GetPaymentsForAccountAsync(string accountNumber);
    Task<Payment?> UpdateStatusAsync(int id, PaymentStatus status);
}
