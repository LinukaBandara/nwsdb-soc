using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NWSDB.IdentityService.Models;
using NWSDB.IdentityService.Services;

namespace NWSDB.IdentityService.Controllers;

[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public class AuthController(
    IUserAccountService users,
    IJwtTokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<AuthResponse> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.AccountNumber))
            return BadRequest("Full name, email, password and account number are required.");

        if (request.Password.Length < 6)
            return BadRequest("Password must contain at least 6 characters.");

        try
        {
            var user = users.CreateCustomer(request);
            return Created("", CreateResponse(user));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult<AuthResponse> Login(LoginRequest request)
    {
        var email = request.Email?.Trim();
        var password = request.Password;

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return BadRequest("Email and password are required.");

        var user = users.FindByEmail(email);

        if (user is null || !users.VerifyPassword(user, password))
            return Unauthorized("Invalid email or password.");

        return Ok(CreateResponse(user));
    }

    // Staff need read-only account visibility for operational lookups.
    // Only Admin can provision accounts through POST /users.
    [Authorize(Roles = "Staff,Admin")]
    [HttpGet("users")]
    public ActionResult<IEnumerable<object>> GetUsers()
    {
        return Ok(users.GetAll().Select(u => new
        {
            id = u.Id,
            fullName = u.FullName,
            email = u.Email,
            role = u.Role,
            accountNumber = u.AccountNumber
        }));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("users")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    public ActionResult<AuthResponse> CreateManagedUser(CreateManagedUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.Role))
            return BadRequest("Full name, email, password and role are required.");

        if (request.Password.Length < 6)
            return BadRequest("Password must contain at least 6 characters.");

        try
        {
            var user = users.CreateManagedUser(request);
            return Created("", CreateResponse(user));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public ActionResult GetCurrentUser()
    {
        return Ok(new
        {
            id = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value,
            fullName = User.Identity?.Name,
            email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value,
            role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value,
            accountNumber = User.FindFirst("accountNumber")?.Value
        });
    }

    private AuthResponse CreateResponse(UserAccount user)
    {
        var (token, expiresAtUtc) = tokens.CreateToken(user);

        return new AuthResponse(
            token,
            expiresAtUtc,
            user.Id,
            user.FullName,
            user.Email,
            user.Role,
            user.AccountNumber);
    }
}
