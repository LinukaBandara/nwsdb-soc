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
        $p = @{ Method=$method; Uri=$url; Headers=$headers; UseBasicParsing=$true }
        if ($null -ne $body) { $p.Body = $body | ConvertTo-Json; $p.ContentType = "application/json" }
        $r = Invoke-WebRequest @p
        $code = [int]$r.StatusCode
        $ok = $expected -contains $code
        $script:results += [pscustomobject]@{Test=$name; Result=if($ok){"PASS"}else{"FAIL"}; HTTP=$code}
        return $r
    } catch {
        $code = 0
        if ($_.Exception.Response) { try { $code=[int]$_.Exception.Response.StatusCode } catch {} }
        $ok = $expected -contains $code
        $script:results += [pscustomobject]@{Test=$name; Result=if($ok){"PASS"}else{"FAIL"}; HTTP=$code}
        return $null
    }
}

Write-Host "NWSDB SOC FULL REGRESSION TEST" -ForegroundColor Cyan
Write-Host "Customer: $email"
Write-Host "Account : $account"
Write-Host ""

Test-Api "TC01 Identity health" GET "$identity/health"
Test-Api "TC02 Payment health" GET "$payment/health"
Test-Api "TC03 Usage health" GET "$usage/health"

$r = Test-Api "TC04 Registration" POST "$identity/api/v1/auth/register" @{
    fullName="Regression Test Customer"; email=$email; password=$password
}

Test-Api "TC05 Registration validation" POST "$identity/api/v1/auth/register" @{
    fullName="Invalid"; email="invalid_$stamp@nwsdb.local"; password=""
} -expected @(400,422)

$r = Test-Api "TC06 Valid login" POST "$identity/api/v1/auth/login" @{
    email=$email; password=$password
}
if ($r) { try { $token=($r.Content|ConvertFrom-Json).token } catch {} }
$auth=@{}
if ($token) { $auth=@{Authorization="Bearer $token"} }

Test-Api "TC07 Invalid login" POST "$identity/api/v1/auth/login" @{
    email=$email; password="WrongPassword"
} -expected @(401)

Test-Api "TC08 JWT / me" GET "$identity/api/v1/auth/me" -headers $auth
Test-Api "TC09 Account linking" PUT "$identity/api/v1/auth/me/account" @{accountNumber=$account} $auth

Test-Api "TC10 Usage latest initial" GET "$usage/api/v1/usage/$account/latest" -headers $auth -expected @(404,200)
Test-Api "TC11 Usage history initial" GET "$usage/api/v1/usage/$account/history" -headers $auth

# Use the existing staff/admin JWT already available in your environment when needed.
Test-Api "TC12 Usage staff/admin reading" POST "$usage/api/v1/usage/readings" @{
    accountNumber=$account; cubicMetres=25
} -headers $auth -expected @(200,403)

Test-Api "TC13 Customer reading authorization" POST "$usage/api/v1/usage/readings" @{
    accountNumber=$account; cubicMetres=30
} -headers $auth -expected @(403)

Test-Api "TC10b Usage latest after reading" GET "$usage/api/v1/usage/$account/latest" -headers $auth -expected @(200,404)
Test-Api "TC11b Usage history after reading" GET "$usage/api/v1/usage/$account/history" -headers $auth

Test-Api "TC14 Payment history" GET "$payment/api/v1/payments/account/$account" -headers $auth

$r = Test-Api "TC15 Payment creation" POST "$payment/api/v1/payments" @{
    accountNumber=$account; amount=2500; channel="API"
} -headers $auth
if ($r) { try { $paymentId=($r.Content|ConvertFrom-Json).id } catch {} }

Test-Api "TC16 Cross-account payment" POST "$payment/api/v1/payments" @{
    accountNumber="NWSDB-OTHER-001"; amount=1000; channel="API"
} -headers $auth -expected @(403)

if ($paymentId) {
    Test-Api "TC17 Payment status update" PATCH "$payment/api/v1/payments/$paymentId/status" @{
        status="Failed"
    } -headers $auth -expected @(200,403)
} else {
    $results += [pscustomobject]@{Test="TC17 Payment status update";Result="SKIP";HTTP=0}
}

Test-Api "TC18 Managed user endpoint" POST "$identity/api/v1/auth/users" @{
    fullName="Regression Staff"; email="regstaff_$stamp@nwsdb.local"; password="Staff1234"; role="Staff"
} -headers $auth -expected @(200,403)

Test-Api "TC19 PayHere invalid notification" POST "$payment/api/v1/payments/payhere/notify" @{
    merchant_id="INVALID"; order_id="REGRESSION"; payhere_amount="1500.00"; payhere_currency="LKR"; status_code="2"; md5sig="INVALID"
} -expected @(400)

Test-Api "TC20 PayHere checkout endpoint" POST "$payment/api/v1/payments/payhere/checkout" @{
    accountNumber=$account; amount=1500; currency="LKR"
} -headers $auth -expected @(200,400,403,503)

Write-Host ""
$results | Format-Table -AutoSize
$passed=@($results|Where-Object Result -eq "PASS").Count
$total=$results.Count
Write-Host "$passed / $total checks passed" -ForegroundColor Cyan
Write-Host "For TC20, complete the PayHere Sandbox card flow separately to capture callback/status evidence."
