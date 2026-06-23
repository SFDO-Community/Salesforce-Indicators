/**
 * @description       : Utility Class for processing Indicator Date conditions
 * @author            : jeffrey-chi
 * @created date      : 11/15/24
 **/
public with sharing class DateUtility {
    public class DateConversionException extends Exception {}

    public class DateRange {
        public Date StartDate { get; private set; }
        public Date EndDate { get; private set; } // exclusive
        public DateRange(Date startDate, Date endDate) {
            this.StartDate = startDate;
            this.EndDate = endDate;
        }
    }

    /**
     * @description       : Computes the Start (inclusive) and End (exclusive) boundary of a Relative Date, matching the
     *                                  documented ranges for both Salesforce Reports/Dashboards (https://help.salesforce.com/s/articleView?id=sf.filter_dates_relative.htm&type=5)
     *                                  and SOQL relative date literals (https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_dateformats.htm).
     *                                  Underscores and spaces are treated interchangeably, so either format can be passed to this method.
     *                                  NEXT N DAYS uses the "custom field filter" interpretation (range starts tomorrow); the Reports
     *                                  "standard date filter" widget's interpretation (range starts today) has no analog in this framework.
     * @author            : jeffrey-chi
 	 * @created date      : 11/15/24
     * @param relativeDate The Relative Date to be converted according to baseDate.
     * @param baseDate The Date that Relative Date will be converted relative to.
     * @return The Relative Date's Start/End boundary as a DateRange.
     */
    public static DateRange convertRelativeDateRange(String relativeDate, Date baseDate) {
        String rdt = relativeDate.toUpperCase().replace('_', ' ').trim();

        if (rdt == 'YESTERDAY') {
            return new DateRange(baseDate.addDays(-1), baseDate);
        } else if (rdt == 'TODAY') {
            return new DateRange(baseDate, baseDate.addDays(1));
        } else if (rdt == 'TOMORROW') {
            return new DateRange(baseDate.addDays(1), baseDate.addDays(2));
        }

        // Group 1 = Direction (LAST/NEXT/THIS), Group 2 = N or a literal count, Group 3 = Unit Type, Group 4 = N's count value
        Matcher m = Pattern.compile('^(LAST|NEXT|THIS)?\\s?([N]?\\d*)?\\s?([^:\\r\\n]*)?:?(\\d*)$').matcher(rdt);
        if (!m.matches()) {
            throw new DateConversionException('Invalid relative date format');
        }

        String direction = m.group(1);
        String varGroup = m.group(2);
        String unitType = m.group(3);

        Integer n;
        if (varGroup == 'N') {
            if (String.isBlank(m.group(4))) {
                throw new DateConversionException('Invalid relative date format');
            }
            n = Integer.valueOf(m.group(4));
        } else if (String.isNotBlank(varGroup)) {
            n = Integer.valueOf(varGroup);
        }
        Integer count = (n == null ? 1 : n);

        Date startDate;
        Date endDate;

        if (unitType == 'DAYS') {
            switch on direction {
                when 'LAST' {
                    startDate = baseDate.addDays(count * -1);
                    endDate = baseDate.addDays(1); // LAST N DAYS always includes today
                } when 'NEXT' {
                    startDate = baseDate.addDays(1); // NEXT N DAYS always starts tomorrow
                    endDate = startDate.addDays(count);
                } when else {
                    throw new DateConversionException('Invalid relative day format');
                }
            }
        } else if (unitType == 'DAYS AGO') {
            if (String.isNotBlank(direction) || n == null) {
                throw new DateConversionException('Invalid relative day format');
            }
            startDate = baseDate.addDays(n * -1);
            endDate = startDate.addDays(1);
        } else if (unitType == 'WEEK' || unitType == 'WEEKS') {
            Date startOfWeek = baseDate.toStartOfWeek();
            switch on direction {
                when 'LAST' {
                    startDate = startOfWeek.addDays(count * -7);
                    endDate = startOfWeek;
                } when 'NEXT' {
                    startDate = startOfWeek.addDays(7);
                    endDate = startDate.addDays(count * 7);
                } when 'THIS' {
                    startDate = startOfWeek;
                    endDate = startOfWeek.addDays(7);
                } when else {
                    throw new DateConversionException('Invalid relative week format');
                }
            }
        } else if (unitType == 'WEEKS AGO') {
            if (String.isNotBlank(direction) || n == null) {
                throw new DateConversionException('Invalid relative week format');
            }
            startDate = baseDate.toStartOfWeek().addDays(n * -7);
            endDate = startDate.addDays(7);
        } else if (unitType == 'MONTH' || unitType == 'MONTHS') {
            Date startOfMonth = baseDate.toStartOfMonth();
            switch on direction {
                when 'LAST' {
                    startDate = startOfMonth.addMonths(count * -1);
                    endDate = startOfMonth;
                } when 'NEXT' {
                    startDate = startOfMonth.addMonths(1);
                    endDate = startDate.addMonths(count);
                } when 'THIS' {
                    startDate = startOfMonth;
                    endDate = startOfMonth.addMonths(1);
                } when else {
                    throw new DateConversionException('Invalid relative month format');
                }
            }
        } else if (unitType == 'MONTHS AGO') {
            if (String.isNotBlank(direction) || n == null) {
                throw new DateConversionException('Invalid relative month format');
            }
            startDate = baseDate.toStartOfMonth().addMonths(n * -1);
            endDate = startDate.addMonths(1);
        } else if (unitType == 'QUARTER' || unitType == 'QUARTERS' || unitType == 'QUARTERS AGO') {
            Integer curQuarter = ((baseDate.month() - 1) / 3) + 1;
            Date curQuarterStart = Date.newInstance(baseDate.year(), 1, 1).addMonths((curQuarter - 1) * 3);
            if (unitType == 'QUARTERS AGO') {
                if (String.isNotBlank(direction) || n == null) {
                    throw new DateConversionException('Invalid relative quarter format');
                }
                startDate = curQuarterStart.addMonths(n * -3);
                endDate = startDate.addMonths(3);
            } else {
                switch on direction {
                    when 'LAST' {
                        startDate = curQuarterStart.addMonths(count * -3);
                        endDate = curQuarterStart;
                    } when 'NEXT' {
                        startDate = curQuarterStart.addMonths(3);
                        endDate = startDate.addMonths(count * 3);
                    } when 'THIS' {
                        startDate = curQuarterStart;
                        endDate = curQuarterStart.addMonths(3);
                    } when else {
                        throw new DateConversionException('Invalid relative quarter format');
                    }
                }
            }
        } else if (unitType == 'YEAR' || unitType == 'YEARS' || unitType == 'YEARS AGO') {
            Date currentYear = Date.newInstance(baseDate.year(), 1, 1);
            if (unitType == 'YEARS AGO') {
                if (String.isNotBlank(direction) || n == null) {
                    throw new DateConversionException('Invalid relative year format');
                }
                startDate = currentYear.addYears(n * -1);
                endDate = startDate.addYears(1);
            } else {
                switch on direction {
                    when 'LAST' {
                        startDate = currentYear.addYears(count * -1);
                        endDate = currentYear;
                    } when 'NEXT' {
                        startDate = currentYear.addYears(1);
                        endDate = startDate.addYears(count);
                    } when 'THIS' {
                        startDate = currentYear;
                        endDate = currentYear.addYears(1);
                    } when else {
                        throw new DateConversionException('Invalid relative year format');
                    }
                }
            }
        } else {
            // TODO: FISCAL YEAR/QUARTER
            throw new DateConversionException('Invalid relative date format');
        }

        return new DateRange(startDate, endDate);
    }
    public static DateRange convertRelativeDateRange(String relativeDate) {
        return convertRelativeDateRange(relativeDate, Date.today());
    }

    /**
     * @description       : Returns the Start boundary of the Relative Date's range. See convertRelativeDateRange for
     *                                  the full Start/End boundary and the documented semantics it's based on.
     * @author            : jeffrey-chi
 	 * @created date      : 11/15/24
     * @param relativeDate The Relative Date to be converted according to baseDate.
     * @param baseDate The Date that Relative Date will be converted relative to.
     * @return The Relative Date's Start boundary as a Date object.
     */
    public static Date convertRelativeDate(String relativeDate, Date baseDate) {
        return convertRelativeDateRange(relativeDate, baseDate).StartDate;
    }
    public static Date convertRelativeDate(String relativeDate) {
        return convertRelativeDate(relativeDate, Date.today());
    }
}
