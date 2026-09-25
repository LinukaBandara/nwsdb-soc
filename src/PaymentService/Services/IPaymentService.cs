using NWSDB.PaymentService.DTOs;
using NWSDB.PaymentService.Models;

namespace NWSDB.PaymentService.Services;

public interface IPaymentService
{
    Task<Payment> CreatePaymentAsync(CreatePaymentRequest request);
    Task<Payment> CreatePendingPaymentAsync(CreatePaymentRequest request);
    Task<Payment?> UpdateStatusByReferenceAsync(string referenceNumber, PaymentStatus status);
    Task<Payment?> GetPaymentAsync(int id);
    Task<IReadOnlyList<Payment>> GetPaymentsForAccountAsync(string accountNumber);
    Task<Payment?> UpdateStatusAsync(int id, PaymentStatus status);
}
