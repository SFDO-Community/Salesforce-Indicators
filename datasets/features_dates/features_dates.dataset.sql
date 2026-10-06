BEGIN TRANSACTION;
CREATE TABLE "Account" (
	id VARCHAR(255) NOT NULL,
	"Name" VARCHAR(255),
	"Test_Date__c" VARCHAR(255),
	"Description" VARCHAR(255),
	"Site" VARCHAR(255),
	PRIMARY KEY (id)
);
INSERT INTO "Account" VALUES('Account-1','Feature Date -400','2018-12-11','Test_Date__c = load date -400 days (CCI anchor_date shifts it)','FDATE-01');
INSERT INTO "Account" VALUES('Account-2','Feature Date -90','2019-10-17','Test_Date__c = load date -90 days (CCI anchor_date shifts it)','FDATE-02');
INSERT INTO "Account" VALUES('Account-3','Feature Date -45','2019-12-01','Test_Date__c = load date -45 days (CCI anchor_date shifts it)','FDATE-03');
INSERT INTO "Account" VALUES('Account-4','Feature Date -35','2019-12-11','Test_Date__c = load date -35 days (CCI anchor_date shifts it)','FDATE-04');
INSERT INTO "Account" VALUES('Account-5','Feature Date -20','2019-12-26','Test_Date__c = load date -20 days (CCI anchor_date shifts it)','FDATE-05');
INSERT INTO "Account" VALUES('Account-6','Feature Date -10','2020-01-05','Test_Date__c = load date -10 days (CCI anchor_date shifts it)','FDATE-06');
INSERT INTO "Account" VALUES('Account-7','Feature Date -1','2020-01-14','Test_Date__c = load date -1 days (CCI anchor_date shifts it)','FDATE-07');
INSERT INTO "Account" VALUES('Account-8','Feature Date +0','2020-01-15','Test_Date__c = load date +0 days (CCI anchor_date shifts it)','FDATE-08');
INSERT INTO "Account" VALUES('Account-9','Feature Date +1','2020-01-16','Test_Date__c = load date +1 days (CCI anchor_date shifts it)','FDATE-09');
INSERT INTO "Account" VALUES('Account-10','Feature Date +10','2020-01-25','Test_Date__c = load date +10 days (CCI anchor_date shifts it)','FDATE-10');
INSERT INTO "Account" VALUES('Account-11','Feature Date +45','2020-02-29','Test_Date__c = load date +45 days (CCI anchor_date shifts it)','FDATE-11');
COMMIT;
