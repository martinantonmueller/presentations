<?xml version="1.0"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:csv="csv:csv"
    xmlns:tei="http://www.tei-c.org/ns/1.0" version="3.0">
    <xsl:output method="text" encoding="utf-8"/>
    
    <xsl:mode on-no-match="shallow-skip"/>
    
    
    
    <xsl:param name="current" select="/" as="node()"/>
    
    <!-- this template creates a csv file for network analysis 
         containing information about the correspondences between 
         arthur schnitzler, hermann bahr, richard beer-hofmann, hugo von hofmannsthal, paul goldmann and felix salten -->
    
    <xsl:variable name="quote" select="'&quot;'"/>
    <xsl:variable name="separator" select="','"/>
    <xsl:variable name="newline" select="'&#xA;'"/>
    
    <xsl:template match="*:network">
        <xsl:result-document href="../csv/schnitzler-koeffizient.csv">
            <xsl:text>Source</xsl:text>
            <xsl:value-of select="$separator"/>
            <xsl:text>SourceID</xsl:text>
            <xsl:value-of select="$separator"/>
            <xsl:text>Target</xsl:text>
            <xsl:value-of select="$separator"/>
            <xsl:text>TargetID</xsl:text>
            <xsl:value-of select="$separator"/>
            <xsl:text>Year</xsl:text>
            <xsl:value-of select="$separator"/>
            <xsl:text>Type</xsl:text>
            <xsl:value-of select="$separator"/>
            <xsl:text>Label</xsl:text>
            <xsl:value-of select="$separator"/>
            <xsl:text>Weight</xsl:text>
            <xsl:value-of select="$newline"/>
            
            
            <xsl:for-each select="*:connection">
                <!-- source -->
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="*:source/*:name"/>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$separator"/>
                
                <!-- sourceID -->
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="*:source/*:id"/>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$separator"/>
                
                <!-- target -->
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="*:target/*:name"/>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$separator"/>
                
                <!-- targetID -->
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="*:target/*:name"/>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$separator"/>
                
                <!-- year -->
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="*:year"/>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$separator"/>
                
                <!-- type -->
                <xsl:value-of select="$quote"/>
                <xsl:text>Directed</xsl:text>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$separator"/>
                
                <!-- label -->
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="concat(*:source/*:name, ' an ', *:target/*:name)"/>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$separator"/>
                
                <!-- weight -->
                <xsl:value-of select="$quote"/>
                <xsl:choose>
                    <xsl:when test="*:target/*:id='2121'">
                        <!-- bei Schnitzler bleiben die Werte gleich -->
                        <xsl:value-of select="round(*:weight)"/>
                    </xsl:when>
                    <xsl:when test="*:target/*:id='10863' and *:source/*:id='11485'">
                        <!-- bei Beer-Hofmann an Goldmann wird nochmals mit 1.75 multipliziert -->
                        <xsl:value-of select="round(*:weight * 1.75)"/> 
                    </xsl:when>
                    <xsl:when test="*:target/*:id='11740'">
                        <xsl:value-of select="round(*:weight div 0.41)"/>
                    </xsl:when>
                    <xsl:when test="*:target/*:id='10815'">
                        <xsl:value-of select="round(*:weight div 0.76)"/>
                    </xsl:when>
                    <xsl:when test="*:target/*:id='2167'">
                        <xsl:value-of select="round(*:weight div 0.34)"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="round(*:weight)"/>
                    </xsl:otherwise>
                </xsl:choose>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$newline"/>
                
            </xsl:for-each>
        </xsl:result-document>
        
        
    </xsl:template>
    
</xsl:stylesheet>
