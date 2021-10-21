@isTest
private class TestExceptionGridController {
    
    @isTest
    static void testShowExceptionGrid() {
        // Create Test Data
        Account acc = new Account();
        acc.Name = 'Test';
        insert acc;
        // Create Test Contact
        Contact contact = new Contact();
        contact.LastName = 'Test';
        insert contact;
        Test.startTest();
            List<ExceptionGridController.ExceptionGridResponse> response = ExceptionGridController.showExceptionGrid(contact.Id);
        Test.stopTest();
        System.assertEquals(response.size(), 2);
    }

}
