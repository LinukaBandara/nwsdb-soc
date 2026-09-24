$ErrorActionPreference = "Continue"

$identity = "http://localhost:5021"
$payment = "http://localhost:5000"
$usage = "http://localhost:5010"

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "regression_$stamp@nwsdb.local"
$password = "Test1234"
$account = "NWSDB-REG-$stamp"

$results = @()
$token = $null
$adminToken = $null
$paymentId = $null

function Test-Api($name, $method, $url, $body = $null, $headers = @{}, $expected = @(200)) {
    try {
        $p = @{
            Method = $method
            Uri = $url
            Headers = $headers
            UseBasicParsing = $true
        }

        if ($null -ne $body) {
            $p.Body = $body | ConvertTo-Json
            $p.ContentType = "application/json"
        }

        $r = Invoke-WebRequest @p
        $code = [int]$r.StatusCode
        $ok = $expected -contains $code

        $script:results += [pscustomobject]@{
            Test = $name
            Result = if ($ok) { "PASS" } else { "FAIL" }
            HTTP = $code
        }

        return $r
    }
    catch {
        $code = 0

        if ($_.Exception.Response) {
            try { $code = [int]$_.Exception.Response.StatusCode } catch {}
        }

        $ok = $expected -contains $code

        $script:results += [pscustomobject]@{
            Test = $name
            Result = if ($ok) { "PASS" } else { "FAIL" }
            HTTP = $code
        }

        return $null
    }
}

Write-Host "NWSDB SOC 20-CASE REGRESSION TEST" -ForegroundColor Cyan
Write-Host "Customer: $email"
Write-Host "Account : $account"
Write-Host ""

# 01-03: service availability
Test-Api "TC01 Identity health" GET "$identity/health"
Test-Api "TC02 Payment health" GET "$payment/health"
Test-Api "TC03 Usage health" GET "$usage/health"

# 04-05: registration
$r = Test-Api "TC04 Registration" POST "$identity/api/v1/auth/register" @{
    fullName = "Regression Test Customer"
    email = $email
    password = $password
} -expected @(201)

Test-Api "TC05 Registration validation" POST "$identity/api/v1/auth/register" @{
    fullName = "Invalid"
    email = "invalid_$stamp@nwsdb.local"
    password = ""
} -expected @(400)

# 06-08: login and JWT
$r = Test-Api "TC06 Valid login" POST "$identity/api/v1/auth/login" @{
    email = $email
    password = $password
} -expected @(200)

if ($r) {
    try { $token = ($r.Content | ConvertFrom-Json).token } catch {}
}

$auth = @{}
if ($token) {
    $auth = @{ Authorization = "Bearer $token" }
}

Test-Api "TC07 Invalid login" POST "$identity/api/v1/auth/login" @{
    email = $email
    password = "WrongPassword"
} -expected @(401)

Test-Api "TC08 JWT / me" GET "$identity/api/v1/auth/me" -headers $auth -expected @(200)

# 09: account linking returns a refreshed JWT containing accountNumber.
$r = Test-Api "TC09 Account linking" PUT "$identity/api/v1/auth/me/account" @{
    accountNumber = $account
} $auth -expected @(200)

if ($r) {
    try {
        $linked = $r.Content | ConvertFrom-Json
        if ($linked.token) {
            $token = $linked.token
            $auth = @{ Authorization = "Bearer $token" }
        }
    } catch {}
}

# 10-11: customer usage access
Test-Api "TC10 Usage latest before reading" GET "$usage/api/v1/usage/$account/latest" -headers $auth -expected @(404)
Test-Api "TC11 Usage history before reading" GET "$usage/api/v1/usage/$account/history" -headers $auth -expected @(200)

# Get a real Admin JWT for privileged operations.
$r = Test-Api "TC12 Admin login" POST "$identity/api/v1/auth/login" @{
    email = "admin@nwsdb.local"
    password = "Admin@123"
} -expected @(200)

if ($r) {
    try { $adminToken = ($r.Content | ConvertFrom-Json).token } catch {}
}

$adminAuth = @{}
if ($adminToken) {
    $adminAuth = @{ Authorization = "Bearer $adminToken" }
}

# 13: staff/admin can record a reading.
$r = Test-Api "TC13 Admin records usage reading" POST "$usage/api/v1/usage/readings" @{
    accountNumber = $account
    cubicMetres = 25
} -headers $adminAuth -expected @(201)

# 14: customer cannot record readings.
Test-Api "TC14 Customer reading authorization" POST "$usage/api/v1/usage/readings" @{
    accountNumber = $account
    cubicMetres = 30
} -headers $auth -expected @(403)

# 15: customer can read usage after a reading exists.
Test-Api "TC15 Usage latest after reading" GET "$usage/api/v1/usage/$account/latest" -headers $auth -expected @(200)

# 16: customer payment history.
Test-Api "TC16 Payment history" GET "$payment/api/v1/payments/account/$account" -headers $auth -expected @(200)

# 17: customer creates a payment.
$r = Test-Api "TC17 Payment creation" POST "$payment/api/v1/payments" @{
    accountNumber = $account
    amount = 2500
    channel = "API"
} -headers $auth -expected @(201)

if ($r) {
    try { $paymentId = ($r.Content | ConvertFrom-Json).id } catch {}
}

# 18: customer cannot access another account.
Test-Api "TC18 Cross-account payment" POST "$payment/api/v1/payments" @{
    accountNumber = "NWSDB-OTHER-001"
    amount = 1000
    channel = "API"
} -headers $auth -expected @(403)

# 19: admin can update payment status.
if ($paymentId) {
    Test-Api "TC19 Admin payment status update" PATCH "$payment/api/v1/payments/$paymentId/status" @{
        status = "Failed"
    } -headers $adminAuth -expected @(200)
} else {
    $results += [pscustomobject]@{
        Test = "TC19 Admin payment status update"
        Result = "FAIL"
        HTTP = 0
    }
}

# 20: invalid PayHere notification must be rejected cleanly.
# PayHere sends application/x-www-form-urlencoded notifications, not JSON.
try {
    $form = @{
        merchant_id = "INVALID"
        order_id = "REGRESSION"
        payhere_amount = "1500.00"
        payhere_currency = "LKR"
        status_code = "2"
        md5sig = "INVALID"
    }

    $r = Invoke-WebRequest -Method POST -Uri "$payment/api/v1/payments/payhere/notify" `
        -Body $form -ContentType "application/x-www-form-urlencoded" -UseBasicParsing

    $code = [int]$r.StatusCode
} catch {
    $code = 0
    if ($_.Exception.Response) {
        try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    }
}

$script:results += [pscustomobject]@{
    Test = "TC20 PayHere invalid notification"
    Result = if ($code -eq 400) { "PASS" } else { "FAIL" }
    HTTP = $code
}

Write-Host ""
$results | Format-Table -AutoSize

$passed = @($results | Where-Object Result -eq "PASS").Count
$total = $results.Count

Write-Host ""
Write-Host "$passed / $total test cases passed" -ForegroundColor Cyan
Write-Host "Note: PayHere Sandbox end-to-end checkout/callback is demonstrated separately because it requires the external Sandbox flow."
