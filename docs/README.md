# CredoRewards Documentation

**A [CredoNomics Investment Solutions](https://credonomics.in) product.**

This documentation is for the experimental open-source CredoRewards TypeScript SDK.
It calculates hypothetical cashback under **explicit caller-supplied rules**;
it does not connect to banks or authenticate real issuer terms.

[← Back to CredoRewards](../README.md) · [Company product identity](BRANDING.md) ·
[GitHub issues](https://github.com/aqdas1820/credorewards-engine/issues)

## Start here

| Objective | Document |
| --- | --- |
| Understand the project and run a synthetic demo | [Main README](../README.md) |
| Find module boundaries and financial invariants | [Architecture](ARCHITECTURE.md) |
| Run the local browser demo and what-if purchase form | [Browser demo](WEB-DEMO.md) |
| Understand what can safely be launched | [Production readiness](PRODUCTION-READINESS.md) |
| Review feature priorities | [Roadmap](ROADMAP.md) |

## SDK financial contracts

| API or topic | Documentation |
| --- | --- |
| Cashback rates, cap precedence and exclusions | [Rule schema](RULE-SCHEMA.md) |
| Independent all-spend-on-one-card ranking | [Card comparison](CARD-COMPARISON.md) |
| Marginal effect of adding a hypothetical purchase | [Purchase impact](PURCHASE-IMPACT.md) |
| Independent scenarios and monthly reports | [Batch reports](BATCH-REPORTS.md) |
| Statement-cycle **spend grouping only** | [Statement cycles](STATEMENT-CYCLES.md) |

## Catalog authoring and source governance

- [Versioned card rule catalog](RULE-CATALOG.md)
- [Catalog governance and audit](CATALOG-GOVERNANCE.md)
- [JSON Schema and runtime validation](SCHEMA-VALIDATION.md)

Catalog provenance and review metadata are not a guarantee that issuer terms have
been independently authenticated. Never submit unsourced bank rewards claims.

## Maintainer operations

- [Automation and protected main](AUTOMATION.md)
- [Static deployment and browser import closure](STATIC-DEPLOYMENT.md)
- [Automated release controls](AUTOMATED-RELEASE.md)
- [npm publishing](NPM-PUBLISHING.md)
- [Release notes](RELEASE-NOTES.md)
- [Production readiness](PRODUCTION-READINESS.md)

Contributions should follow the [contribution guide](../CONTRIBUTING.md)
and [code of conduct](../CODE_OF_CONDUCT.md). Report security concerns
**privately** per [SECURITY.md](../SECURITY.md).

## Publisher and brand

**CredoNomics Investment Solutions**

[Company website](https://credonomics.in) ·
[Support email](mailto:support@credonomics.in) ·
[Sister project — CredoNomics Cyber Solutions](https://github.com/aqdas1820/credonomics-cyber-solutions)

[Brand assets, usage and identity](BRANDING.md) · [MIT License](../LICENSE)

Actual bank names and third-party financial data retain their owners' rights.
The owner-supplied CredoRewards artwork identifies this project; it is not
proof of a production rewards or loyalty service.
