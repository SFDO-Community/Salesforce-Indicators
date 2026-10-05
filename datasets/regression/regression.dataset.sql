BEGIN TRANSACTION;
CREATE TABLE "Account" (
	id VARCHAR(255) NOT NULL,
	"Name" VARCHAR(255),
	"AccountNumber" VARCHAR(255),
	"TickerSymbol" VARCHAR(255),
	"Rating" VARCHAR(255),
	"NumberOfEmployees" VARCHAR(255),
	"AnnualRevenue" VARCHAR(255),
	"Description" VARCHAR(255),
	"Site" VARCHAR(255),
	"ParentId" VARCHAR(255),
	PRIMARY KEY (id)
);
INSERT INTO "Account" VALUES('Account-1','Regression Blank','','','','','','Archetype: every field null','ACC-01','');
INSERT INTO "Account" VALUES('Account-2','Regression Zero','Alpha','Alpha','Hot','0','0.0','Archetype: zeros; text rule match ''alp''','ACC-02','');
INSERT INTO "Account" VALUES('Account-3','Regression Neg','Gold','ALPHA','Warm','-5','99.99','Negative count; Gold combo match; case variant','ACC-03','');
INSERT INTO "Account" VALUES('Account-4','Regression Five','Silver','alphabet','Cold','5','100.0','Silver; contains/starts-with but not equals; currency at min','ACC-04','');
INSERT INTO "Account" VALUES('Account-5','Regression Ten','other','Beta','','10','100.01','Numeric min boundary; no rating; currency inside range','ACC-05','');
INSERT INTO "Account" VALUES('Account-6','Regression Fifteen','','xyz','Hot','15','200.5','Null AccountNumber; inside 10-20; currency at max','ACC-06','');
INSERT INTO "Account" VALUES('Account-7','Regression Twenty','Gold','','Warm','20','','Numeric max boundary (exclusive); null ticker and revenue','ACC-07','');
INSERT INTO "Account" VALUES('Account-8','Regression TwentyFive','Alpha','Beta','Cold','25','150.0','Above range; Alpha in TXT-1','ACC-08','');
CREATE TABLE "Contact" (
	id VARCHAR(255) NOT NULL,
	"FirstName" VARCHAR(255),
	"LastName" VARCHAR(255),
	"DoNotCall" VARCHAR(255),
	"Title" VARCHAR(255),
	"AccountId" VARCHAR(255),
	PRIMARY KEY (id)
);
INSERT INTO "Contact" VALUES('Contact-1','CON-01','Regression Contact 1','True','DoNotCall true; parent AccountNumber Gold (Advanced Field match)','Account-3');
INSERT INTO "Contact" VALUES('Contact-2','CON-02','Regression Contact 2','False','DoNotCall false; parent Silver (no match)','Account-4');
INSERT INTO "Contact" VALUES('Contact-3','CON-03','Regression Contact 3','True','DoNotCall true; no Account (parent blank)','');
INSERT INTO "Contact" VALUES('Contact-4','CON-04','Regression Contact 4','False','DoNotCall false; no Account','');
INSERT INTO "Contact" VALUES('Contact-5','CON-05','Regression Contact 5','False','DoNotCall false; parent AccountNumber null','Account-6');
COMMIT;
