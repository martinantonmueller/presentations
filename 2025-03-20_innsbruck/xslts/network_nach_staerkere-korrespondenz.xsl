<?xml version="1.0"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:csv="csv:csv"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    version="3.0">
    
    <xsl:output method="text" encoding="utf-8"/>
    <xsl:mode on-no-match="shallow-skip"/>
    
    <!-- Es wird nur der Wert ausgegeben, der stärker ist.
         Also, wenn in einer Korrespondenz z.B. 5 Briefe von source an target
         und 4 in die Gegenrichtung vorhanden sind, wird nur der mit Gewicht doppelt ausgegeben. -->
    
    <xsl:variable name="quote" select="'&quot;'"/>
    <xsl:variable name="separator" select="','"/>
    <xsl:variable name="newline" select="'&#xA;'"/>
    
    <xsl:template match="*:network">
       <xsl:result-document href="../csv/staerkere-seite.csv">
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
            <!-- Prüfe, ob es eine reverse connection gibt:
                 Die umgekehrte Connection hat als source den aktuellen target, 
                 als target den aktuellen source und das Jahr stimmt überein. -->
            <xsl:variable name="reverse" 
                select="../*:connection[
                *:source/*:name = current()/*:target/*:name and 
                *:target/*:name = current()/*:source/*:name and 
                *:year = current()/*:year
                ]"/>
            <!-- Ausgabe, wenn entweder keine reverse connection vorhanden ist
                 oder das Gewicht der aktuellen Connection größer ist als das Maximum 
                 der Gewichte der umgekehrten Connection(en) -->
            <xsl:if test="not($reverse) or (number(*:weight) > max($reverse/*:weight))">
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
                <xsl:value-of select="*:target/*:id"/>
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
                <xsl:value-of select="number(*:weight) * 2"/>
                <xsl:value-of select="$quote"/>
                <xsl:value-of select="$newline"/>
            </xsl:if>
        </xsl:for-each>
       </xsl:result-document>
    </xsl:template>
    
</xsl:stylesheet>
