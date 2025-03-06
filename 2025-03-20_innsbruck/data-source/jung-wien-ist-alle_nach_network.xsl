<?xml version="1.0"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:tei="http://www.tei-c.org/ns/1.0" version="3.0">
    <xsl:output method="xml" encoding="utf-8" indent="yes"/>
    <xsl:mode on-no-match="shallow-skip"/>
    
    <xsl:template match="*:corresp">
        <network>
            <xsl:for-each-group select="child::*:correspDesc" group-by=
                "concat(
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
                
                <xsl:sort select="
                    substring(
                    (current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@when,
                    current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@notBefore,
                    current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@from,
                    current-group()[1]/child::*:correspAction[@type = 'sent']/*:date/@notAfter)[1],
                    1, 4)" data-type="number"/>
                
                <xsl:variable name="source"
                    select="current-group()[1]/child::*:correspAction[@type = 'sent']/*:persName[1]"/>
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
                
                <connection>
                    <source>
                        <name><xsl:value-of select="$source"/></name>
                        <id><xsl:value-of select="$sourceID"/></id>
                    </source>
                    <target>
                        <name><xsl:value-of select="$target"/></name>
                        <id><xsl:value-of select="$targetID"/></id>
                    </target>
                    <year><xsl:value-of select="$year"/></year>
                    <weight><xsl:value-of select="$weight"/></weight>
                </connection>
            </xsl:for-each-group>
        </network>
    </xsl:template>
</xsl:stylesheet>
