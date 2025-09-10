<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0">
    
    <xsl:output method="text" encoding="utf-8"/>
    
   <xsl:mode on-no-match="shallow-skip"/>
    
    
    <xsl:template match="/">
        <xsl:apply-templates/>
    </xsl:template>
    
    <!-- Vorlage für das *:network-Element -->
    <xsl:template match="*:network">
        <!-- Wurzel als Variable, damit in untergeordneten Kontexten darauf zugegriffen werden kann -->
        <xsl:variable name="root" select="."/>
        
        <!-- Ermittlung der eindeutigen Target-Namen -->
        <xsl:variable name="sender">
            <list>
            <xsl:for-each select="distinct-values(*:connection/*:target/*:name)" >
                <xsl:element name="item">
                    <xsl:value-of select="."/>
                </xsl:element>
            </xsl:for-each>
            </list>
        </xsl:variable>
      
        <xsl:text>Source, Target, Strength&#10;</xsl:text>
        
        <!-- Für jede Source: Zeile erzeugen mit summierten Gewichten pro Target -->
        <xsl:for-each select="$sender//item">
            <xsl:variable name="sourceName" select="."/>
            
            <xsl:for-each select="$sender//item[. != $sourceName]">
                <xsl:value-of select="$sourceName"/>
                <xsl:text>,</xsl:text>
                
                <xsl:variable name="targetName" select="."/>
                <xsl:value-of select="$targetName"/>
                <xsl:text>,</xsl:text>
                <xsl:choose>
                    <xsl:when test="$sourceName = $targetName">
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:variable name="total" 
                            select="sum($root/*:connection
                            [*:source/*:name = $sourceName 
                            and *:target/*:name = $targetName]
                            /*:weight)"/>
                        <xsl:value-of select="$total"/>
                    </xsl:otherwise>
                </xsl:choose>
                
                <xsl:text>&#10;</xsl:text>
            </xsl:for-each>
            
            
        </xsl:for-each>
    </xsl:template>
    
</xsl:stylesheet>
