# Build from the repository root so Railway can deploy this service from a monorepo.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/UsageService/UsageService.csproj", "src/UsageService/"]
RUN dotnet restore "src/UsageService/UsageService.csproj"

COPY ["src/UsageService/", "src/UsageService/"]
WORKDIR /src/src/UsageService
RUN dotnet publish "UsageService.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "UsageService.dll"]
