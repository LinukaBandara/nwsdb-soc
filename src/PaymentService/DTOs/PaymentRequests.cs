namespace NWSDB.PaymentService.DTOs;

public record CreatePaymentRequest(string AccountNumber, decimal Amount, string Channel);

public record UpdatePaymentStatusRequest(string Status);

public record PayHereCheckoutRequest(string AccountNumber, decimal Amount);

public record PayHereCheckoutResponse(string ActionUrl, Dictionary<string, string> Fields);