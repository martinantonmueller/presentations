<?xml version="1.0"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:csv="csv:csv"
    xmlns:tei="http://www.tei-c.org/ns/1.0" version="3.0">
    <xsl:output method="text" encoding="utf-8"/>
    
    <xsl:mode on-no-match="shallow-skip"/>
    
    <!-- this template creates a csv file for network analysis 
         containing information about the correspondences between 
         arthur schnitzler, hermann bahr, richard beer-hofmann, hugo von hofmannsthal, paul goldmann and felix salten -->
    
    <xsl:variable name="quote" select="'&quot;'"/>
    <xsl:variable name="separator" select="','"/>
    <xsl:variable name="newline" select="'&#xA;'"/>
    
    <xsl:template match="*:corresp">
        
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
        
        <xsl:for-each-group select="child::*:correspDesc" 
            group-by="concat(
            child::*:correspAction[@type = 'sent']/*:persName[1],
            '|',
            child::*:correspAction[@type = 'received']/*:persName[1],
            '|',
            substring(
            (child::*:correspAction[@type = 'sent']/*:date/@when,
            child::*:correspAction[@type = 'sent']/*:date/@notBefore,
            child::*:correspAction[@type = 'sent']/*:date/@from,
            child::*:correspAction[@type = 'sent']/*:date/@notAfter)[1],
            1, 4))">
            
            <xsl:sort select="substring(
                (current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@when,
                current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@notBefore,
                current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@from,
                current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@notAfter)[1],
                1, 4)" data-type="number"/>
            
            <xsl:variable name="source" select="current-group()[1]/child::*:correspAction[@type = 'sent']/*:persName[1]"/>
            <xsl:variable name="sourceID" select="$source/@pmb-ref"/>
            
            <xsl:variable name="target"
                select="current-group()[1]/child::*:correspAction[@type = 'received']/*:persName[1]"/>
            <xsl:variable name="targetID" select="$target/@pmb-ref"/>
            
            <xsl:variable name="year" select="
                substring(
                (current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@when,
                current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@notBefore,
                current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@from,
                current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@notAfter)[1],
                1, 4)"/>
            
            <xsl:variable name="type" select="'Directed'"/>
            
            <xsl:variable name="label" select="concat($source, ' an ', $target, ', ', $year)"/>
            
            <xsl:variable name="weight" select="count(current-group())"/>
            
            <!-- source -->
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$source"/>
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$separator"/>
            
            <!-- sourceID -->
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$sourceID"/>
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$separator"/>
            
            <!-- target -->
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$target"/>
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$separator"/>
            
            <!-- targetID -->
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$targetID"/>
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$separator"/>
            
            <!-- year -->
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$year"/>
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$separator"/>
            
            <!-- type -->
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$type"/>
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$separator"/>
            
            <!-- label -->
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$label"/>
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$separator"/>
            
            <!-- weight -->
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$weight"/>
            <xsl:value-of select="$quote"/>
            <xsl:value-of select="$newline"/>
            
        </xsl:for-each-group>
        
    </xsl:template>
    
</xsl:stylesheet>
