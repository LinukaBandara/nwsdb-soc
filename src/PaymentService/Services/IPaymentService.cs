using NWSDB.PaymentService.Models;

namespace NWSDB.PaymentService.Services;

/// <summary>
/// Defines the operations provided by the payment service.
/// The interface keeps business logic separate from the HTTP controller,
/// making the service easier to test and maintain.
/// </summary>
public interface IPaymentService
{
    Task<Payment> CreatePaymentAsync(CreatePaymentRequest request);
    Task<Payment> CreatePendingPaymentAsync(CreatePaymentRequest request);
    Task<Payment?> UpdateStatusByReferenceAsync(string referenceNumber, PaymentStatus status);
    Task<Payment?> GetPaymentAsync(int id);
    Task<IReadOnlyList<Payment>> GetPaymentsForAccountAsync(string accountNumber);
    Task<Payment?> UpdateStatusAsync(int id, PaymentStatus status);
}
