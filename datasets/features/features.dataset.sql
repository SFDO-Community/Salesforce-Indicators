BEGIN TRANSACTION;
CREATE TABLE "Account" (
	id VARCHAR(255) NOT NULL,
	"Name" VARCHAR(255),
	"AccountNumber" VARCHAR(255),
	"TickerSymbol" VARCHAR(255),
	"Rating" VARCHAR(255),
	"NumberOfEmployees" VARCHAR(255),
	"Description" VARCHAR(255),
	"Site" VARCHAR(255),
	PRIMARY KEY (id)
);
INSERT INTO "Account" VALUES('Account-1','Feature Full','FEAT-FULL-001','CRM','Hot','25','Archetype: every field populated','FEAT-01');
INSERT INTO "Account" VALUES('Account-2','Feature Blank','','','','','Archetype: every feature field blank','FEAT-02');
INSERT INTO "Account" VALUES('Account-3','Feature Cold','FEAT-COLD-003','ZZZ','Cold','3','Archetype: populated, but no Hot rule matches','FEAT-03');
COMMIT;
