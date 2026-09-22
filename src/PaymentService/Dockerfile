# Build from the repository root so Railway can deploy this service from a monorepo.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/PaymentService/PaymentService.csproj", "src/PaymentService/"]
RUN dotnet restore "src/PaymentService/PaymentService.csproj"

COPY ["src/PaymentService/", "src/PaymentService/"]
WORKDIR /src/src/PaymentService
RUN dotnet publish "PaymentService.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "PaymentService.dll"]
