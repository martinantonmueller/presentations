<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    version="3.0">
    
    <xsl:output method="text" encoding="UTF-8"/>
    
    <!-- Schlüssel für eindeutige Personen (Muenchian‑Grouping) -->
    <xsl:key name="persons" match="pair/person" use="@id"/>
    <xsl:param name="current" select="/"></xsl:param>
    
    <xsl:template match="/">
        <!-- Kopfzeile: erste Zelle leer, dann alle eindeutigen Personennamen -->
        <xsl:text>,</xsl:text>
        <xsl:for-each select="results/pair/person[generate-id() = generate-id(key('persons', @id)[1])]">
            <xsl:sort select="."/>
            <xsl:if test="position() &gt; 1">
                <xsl:text>,</xsl:text>
            </xsl:if>
            <xsl:value-of select="."/>
        </xsl:for-each>
        <xsl:text>&#10;</xsl:text>
        
        <!-- Für jede Zeile (jede eindeutige Person) -->
        <xsl:for-each select="results/pair/person[generate-id() = generate-id(key('persons', @id)[1])]">
            <xsl:sort select="."/>
            <!-- Zeilenkopf: Name der Person -->
            <xsl:value-of select="."/>
            <xsl:variable name="currentRowId" select="@id"/>
            <!-- Für jede Spalte (ebenfalls eindeutige Person) -->
            <xsl:for-each select="$current/results/pair/person[generate-id() = generate-id(key('persons', @id)[1])]">
                <xsl:sort select="."/>
                <xsl:text>,</xsl:text>
                <xsl:variable name="currentColId" select="@id"/>
                <!-- Suche nur das direct-Paar -->
                <xsl:variable name="pair" select="$current/results/pair[person[1][@id=$currentRowId] and person[2][@id=$currentColId]]"/>
                <xsl:choose>
                    <xsl:when test="$pair">
                        <!--
                        <xsl:value-of select="replace($pair/coefficient, '.', ',')"/>
                        <xsl:text>"</xsl:text>-->
                        <xsl:text>"</xsl:text>
                        <xsl:value-of select="substring-before($pair/coefficient, '.')"/>
                        <xsl:text>,</xsl:text>
                        <xsl:value-of select="substring-after($pair/coefficient, '.')"/>
                        <xsl:text>"</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- Leere Zelle, falls kein direct-Paar mit Koeffizient vorhanden -->
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:for-each>
            <xsl:text>&#10;</xsl:text>
        </xsl:for-each>
    </xsl:template>
    
</xsl:stylesheet>
