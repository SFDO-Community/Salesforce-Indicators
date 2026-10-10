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
CREATE TABLE "Contact" (
	id VARCHAR(255) NOT NULL,
	"FirstName" VARCHAR(255),
	"LastName" VARCHAR(255),
	"DoNotCall" VARCHAR(255),
	"Title" VARCHAR(255),
	"AccountId" VARCHAR(255),
	PRIMARY KEY (id)
);
INSERT INTO "Contact" VALUES('Contact-1','Feature','Feature Contact Full','True','FCON-01','Account-1');
INSERT INTO "Contact" VALUES('Contact-2','Feature','Feature Contact Blank','False','FCON-02','Account-2');
INSERT INTO "Contact" VALUES('Contact-3','Feature','Feature Contact Cold','True','FCON-03','Account-3');
INSERT INTO "Contact" VALUES('Contact-4','Feature','Feature Contact Orphan','False','FCON-04','');
COMMIT;
