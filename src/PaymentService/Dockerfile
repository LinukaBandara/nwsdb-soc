# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["PaymentService.csproj", "./"]
RUN dotnet restore "PaymentService.csproj"
COPY . .
RUN dotnet publish "PaymentService.csproj" -c Release -o /app/publish --no-restore

# --- Runtime stage (smaller image, no SDK) ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "PaymentService.dll"]
