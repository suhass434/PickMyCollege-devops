import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import categories from '../config/categories.js';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottom: '2 solid #1a3b89',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1a3b89',
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    fontStyle: 'italic',
  },
  criteriaSection: {
    marginBottom: 20,
    padding: 15,
    border: '1 solid #1a3b89',
    backgroundColor: '#f8f9fb',
  },
  criteriaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a3b89',
    borderBottom: '1 solid #1a3b89',
    paddingBottom: 5,
  },
  criteriaRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  criteriaLabel: {
    width: 140,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  criteriaValue: {
    flex: 1,
    fontSize: 10,
    color: '#333333',
  },
  tableSection: {
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a3b89',
    borderBottom: '1 solid #1a3b89',
    paddingBottom: 5,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
    borderCollapse: 'collapse',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 1,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderColor: '#000000',
    padding: 6,
    backgroundColor: '#ffffff',
  },
  tableColHeader: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 1,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderColor: '#000000',
    backgroundColor: '#ffffff', 
    padding: 8,
  },
  tableColLast: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 1,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderColor: '#000000',
    padding: 6,
    backgroundColor: '#ffffff',
  },
  tableColHeaderLast: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 1,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    padding: 8,
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'left',
    color: '#000000',
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'left',
    color: '#000000',
  },
  serialCol: {
    width: '8%',
    textAlign: 'center',
  },
  codeCol: {
    width: '12%',
  },
  nameCol: {
    width: '35%',
  },
  locationCol: {
    width: '15%',
  },
  branchCol: {
    width: '20%',
  },
  cutoffCol: {
    width: '10%',
    textAlign: 'center',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: '1 solid #666666',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 5,
  },
  disclaimer: {
    fontSize: 8,
    color: '#999999',
    fontStyle: 'italic',
  },
});

const PDFDocument = ({ recommendations = [], userInputs = {} }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formatBranches = (branches) => {
    if (!branches || branches.length === 0) return 'Any Branch';
    return branches.join(', ');
  };

  const formatLocations = (locations) => {
    if (!locations || locations.length === 0) return 'Any Location';
    return locations.join(', ');
  };

  // Function to get category label from value
  const getCategoryLabel = (categoryValue) => {
    if (!categoryValue) return 'Not specified';
    
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>COLLEGE RECOMMENDATIONS REPORT</Text>
          <Text style={styles.subtitle}>Generated on: {currentDate}</Text>
        </View>

        {Object.keys(userInputs).length > 0 && (
          <View style={styles.criteriaSection}>
            <Text style={styles.criteriaTitle}>Search Criteria</Text>
            
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>Rank:</Text>
              <Text style={styles.criteriaValue}>{userInputs.rank || 'Not specified'}</Text>
            </View>
            
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>Category:</Text>
              <Text style={styles.criteriaValue}>{getCategoryLabel(userInputs.category)}</Text>
            </View>
            
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>Preferred Locations:</Text>
              <Text style={styles.criteriaValue}>{formatLocations(userInputs.location)}</Text>
            </View>
            
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>Preferred Branches:</Text>
              <Text style={styles.criteriaValue}>{formatBranches(userInputs.branches)}</Text>
            </View>
            
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>Number of Colleges:</Text>
              <Text style={styles.criteriaValue}>{userInputs.num_colleges || 'Not specified'}</Text>
            </View>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableRow} fixed >
            <View style={[styles.tableColHeader, styles.serialCol]}>
              <Text style={styles.tableCellHeader}>S.No.</Text>
            </View>
            <View style={[styles.tableColHeader, styles.codeCol]}>
              <Text style={styles.tableCellHeader}>College Code</Text>
            </View>
            <View style={[styles.tableColHeader, styles.nameCol]}>
              <Text style={styles.tableCellHeader}>College Name</Text>
            </View>
            <View style={[styles.tableColHeader, styles.locationCol]}>
              <Text style={styles.tableCellHeader}>Location</Text>
            </View>
            <View style={[styles.tableColHeader, styles.branchCol]}>
              <Text style={styles.tableCellHeader}>Branch</Text>
            </View>
            <View style={[styles.tableColHeaderLast, styles.cutoffCol]}>
              <Text style={styles.tableCellHeader}>Cutoff</Text>
            </View>
          </View>

          {recommendations.length > 0 ? (
            recommendations.map((college, idx) => (
              <View key={college.code || idx} style={styles.tableRow} wrap={false}>
                <View style={[styles.tableCol, styles.serialCol]}>
                  <Text style={styles.tableCell}>{idx + 1}</Text>
                </View>
                <View style={[styles.tableCol, styles.codeCol]}>
                  <Text style={styles.tableCell}>{college.code || 'N/A'}</Text>
                </View>
                <View style={[styles.tableCol, styles.nameCol]}>
                  <Text style={styles.tableCell}>
                    {college.college || college.name || 'Unnamed College'}
                  </Text>
                </View>
                <View style={[styles.tableCol, styles.locationCol]}>
                  <Text style={styles.tableCell}>{college.location || 'N/A'}</Text>
                </View>
                <View style={[styles.tableCol, styles.branchCol]}>
                  <Text style={styles.tableCell}>{college.branch || 'N/A'}</Text>
                </View>
                <View style={[styles.tableColLast, styles.cutoffCol]}>
                  <Text style={styles.tableCell}>{college.latest_cutoff || 'N/A'}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <View style={[styles.tableColLast, { width: '100%', textAlign: 'center' }]}>
                <Text style={styles.tableCell}>No colleges found for the given criteria.</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This report contains {recommendations.length} college recommendations based on your specified criteria.
          </Text>
          <Text style={styles.disclaimer}>
            Note: Cutoff ranks are based on previous year data and may vary for the current admission cycle.
          </Text>
          <Text style={styles.disclaimer}>
            Generated by <Link src="https://pickmycollege.vercel.app/" style={{ color: '#1a3b89', textDecoration: 'underline' }}>PickMyCollege</Link> - College Recommendation System
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default PDFDocument;
