<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:my="whatever"
    exclude-result-prefixes="xs my">
    
    <xsl:output method="xml" indent="yes"/>
    
    <!-- Hilfsfunktion, die zwei IDs sortiert (kleiner|größer) zurückgibt -->
    <xsl:function name="my:sortedPair" as="xs:string">
        <xsl:param name="id1" as="xs:string"/>
        <xsl:param name="id2" as="xs:string"/>
        <xsl:choose>
            <xsl:when test="$id1 le $id2">
                <xsl:sequence select="concat($id1, '|', $id2)"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:sequence select="concat($id2, '|', $id1)"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Ausgangspunkt: alle connection-Elemente aus dem Netzwerk -->
    <xsl:template match="/network">
        <results>
            <!-- Gruppierung aller <connection> nach dem sortierten Paar aus source/id und target/id -->
            <xsl:for-each-group select="connection" group-by="my:sortedPair(source/id, target/id)">
                <!-- Extrahiere die beiden IDs aus dem Gruppierungsschlüssel -->
                <xsl:variable name="firstID" select="tokenize(current-grouping-key(), '\|')[1]"/>
                <xsl:variable name="secondID" select="tokenize(current-grouping-key(), '\|')[2]"/>
                
                <!-- Summiere die Gewichte aus allen Jahren -->
                <xsl:variable name="sumForward" 
                    select="sum(current-group()[source/id = $firstID and target/id = $secondID]/weight)"/>
                <xsl:variable name="sumBackward" 
                    select="sum(current-group()[source/id = $secondID and target/id = $firstID]/weight)"/>
                
                <!-- Erstes Pair: Direkte Darstellung -->
                <pair order="direct" key="{current-grouping-key()}">
                    <person id="{$firstID}">
                        <xsl:value-of select="(current-group()[source/id=$firstID]/source/name 
                            | current-group()[target/id=$firstID]/target/name)[1]"/>
                    </person>
                    <person id="{$secondID}">
                        <xsl:value-of select="(current-group()[source/id=$secondID]/source/name 
                            | current-group()[target/id=$secondID]/target/name)[1]"/>
                    </person>
                    <xsl:if test="$sumForward gt 0 and $sumBackward gt 0">
                        <coefficient>
                            <xsl:value-of select="format-number($sumForward div $sumBackward, '0.00')"/>
                        </coefficient>
                    </xsl:if>
                </pair>
                
                <!-- Zweites Pair: Reverse Darstellung (Source und Target vertauscht, Koeffizient umgekehrt) -->
                <pair order="reverse" key="{current-grouping-key()}">
                    <person id="{$secondID}">
                        <xsl:value-of select="(current-group()[source/id=$secondID]/source/name 
                            | current-group()[target/id=$secondID]/target/name)[1]"/>
                    </person>
                    <person id="{$firstID}">
                        <xsl:value-of select="(current-group()[source/id=$firstID]/source/name 
                            | current-group()[target/id=$firstID]/target/name)[1]"/>
                    </person>
                    <xsl:if test="$sumForward gt 0 and $sumBackward gt 0">
                        <coefficient>
                            <xsl:value-of select="format-number($sumBackward div $sumForward, '0.00')"/>
                        </coefficient>
                    </xsl:if>
                </pair>
            </xsl:for-each-group>
        </results>
    </xsl:template>
    
</xsl:stylesheet>
