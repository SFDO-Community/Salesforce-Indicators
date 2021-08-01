@isTest
private class IndicatorsControllerTest {
    
    @isTest
    static void testIndicators() {
        // Create Test Data
        Account acc = new Account();
        acc.Name = 'Test';
        insert acc;
        // Create Test Contact
        Test.startTest();
            List<IndicatorsController.IndicatorsResponse> response = IndicatorsController.showIndicators(acc.Id);
        Test.stopTest();
        System.assertEquals(response.size(), 5);
    }

}