/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/*.spec.ts"],
    // Aqui você diz de onde coletar cobertura:
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/tests/**",      // não contar arquivos de teste
        "!src/generated/**",     // não contar o client do prisma gerado
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
};
